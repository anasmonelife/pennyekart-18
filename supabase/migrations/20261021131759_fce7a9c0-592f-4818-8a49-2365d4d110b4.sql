CREATE TABLE public.commission_payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_user_id UUID NOT NULL,
  requested_amount NUMERIC NOT NULL CHECK (requested_amount > 0),
  commission_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'approved', 'rejected')),
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payout_requests TO authenticated;
GRANT ALL ON public.commission_payout_requests TO service_role;

ALTER TABLE public.commission_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own payout requests"
  ON public.commission_payout_requests FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "Customers create own payout requests"
  ON public.commission_payout_requests FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Super admins manage payout requests"
  ON public.commission_payout_requests FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER set_commission_payout_updated_at
  BEFORE UPDATE ON public.commission_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_commission_payout(_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_total NUMERIC;
  v_committed NUMERIC;
  v_max NUMERIC;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to request a payout';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Enter a payout amount';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.community_commission_allocations
    WHERE customer_user_id = v_user AND status = 'allocated';

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_committed
    FROM public.commission_payout_requests
    WHERE customer_user_id = v_user AND status IN ('pending', 'verified', 'approved');

  v_max := ROUND(v_total * 0.80, 2);
  IF _amount > v_max - v_committed THEN
    RAISE EXCEPTION 'You can request up to ₹% now (20%% of sales commission is held)',
      to_char(GREATEST(v_max - v_committed, 0), 'FM999999990.00');
  END IF;

  INSERT INTO public.commission_payout_requests (customer_user_id, requested_amount, commission_total)
  VALUES (v_user, _amount, v_total)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.review_commission_payout(_id UUID, _action TEXT, _notes TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.commission_payout_requests%ROWTYPE;
  v_wallet_id UUID;
  v_balance NUMERIC;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can review payout requests';
  END IF;

  SELECT * INTO r FROM public.commission_payout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF _action = 'verify' THEN
    IF r.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be verified';
    END IF;
    UPDATE public.commission_payout_requests
      SET status = 'verified', verified_at = now(),
          admin_notes = COALESCE(_notes, admin_notes), updated_at = now()
      WHERE id = _id;
  ELSIF _action = 'reject' THEN
    IF r.status NOT IN ('pending', 'verified') THEN
      RAISE EXCEPTION 'This request is already processed';
    END IF;
    UPDATE public.commission_payout_requests
      SET status = 'rejected', rejected_at = now(),
          admin_notes = COALESCE(_notes, admin_notes), updated_at = now()
      WHERE id = _id;
  ELSIF _action = 'approve' THEN
    IF r.status <> 'verified' THEN
      RAISE EXCEPTION 'Verify the request before approving';
    END IF;

    SELECT id, balance INTO v_wallet_id, v_balance
      FROM public.customer_wallets
      WHERE customer_user_id = r.customer_user_id
      FOR UPDATE;
    IF v_wallet_id IS NULL THEN
      RAISE EXCEPTION 'Customer has no wallet';
    END IF;
    IF v_balance < r.requested_amount THEN
      RAISE EXCEPTION 'Wallet balance is lower than the payout amount';
    END IF;

    UPDATE public.customer_wallets
      SET balance = balance - r.requested_amount, updated_at = now()
      WHERE id = v_wallet_id;

    INSERT INTO public.customer_wallet_transactions
      (wallet_id, customer_user_id, type, amount, description, created_by)
    VALUES
      (v_wallet_id, r.customer_user_id, 'debit', r.requested_amount,
       'Sales commission payout', auth.uid());

    UPDATE public.commission_payout_requests
      SET status = 'approved', approved_at = now(),
          admin_notes = COALESCE(_notes, admin_notes), updated_at = now()
      WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;

  RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION public.request_commission_payout(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_commission_payout(UUID, TEXT, TEXT) TO authenticated;