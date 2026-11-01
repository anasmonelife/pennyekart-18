ALTER TABLE public.community_commission_allocations
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS revised_amount numeric,
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revised_at timestamptz;

CREATE OR REPLACE FUNCTION public.revise_commission_allocation(_id uuid, _new_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.community_commission_allocations%ROWTYPE;
  w uuid;
  t uuid;
  _new numeric;
  _diff numeric;
  _balance numeric;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super admins can revise allocations'; END IF;
  IF _new_amount IS NULL OR _new_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  _new := round(_new_amount, 2);
  SELECT * INTO a FROM public.community_commission_allocations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  IF a.status <> 'allocated' THEN RAISE EXCEPTION 'Only allocated rows can be revised'; END IF;
  IF a.customer_user_id IS NULL THEN RAISE EXCEPTION 'No Pennyekart account linked to this person'; END IF;
  _diff := _new - a.amount;
  IF _diff = 0 THEN RETURN _new; END IF;

  INSERT INTO public.customer_wallets(customer_user_id)
  VALUES (a.customer_user_id) ON CONFLICT (customer_user_id) DO NOTHING;
  SELECT id, balance INTO w, _balance
    FROM public.customer_wallets
   WHERE customer_user_id = a.customer_user_id
   FOR UPDATE;
  IF w IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _diff < 0 AND _balance + _diff < 0 THEN
    RAISE EXCEPTION 'Wallet balance ₹% is too low to reduce the commission by ₹%', _balance, abs(_diff);
  END IF;

  UPDATE public.customer_wallets SET balance = balance + _diff, updated_at = now() WHERE id = w;
  INSERT INTO public.customer_wallet_transactions(wallet_id, customer_user_id, type, amount, description, created_by)
  VALUES (w, a.customer_user_id,
          CASE WHEN _diff > 0 THEN 'credit' ELSE 'debit' END,
          abs(_diff),
          'Commission revision · ' || a.community_name || ' · ' || a.period_from || ' to ' || a.period_to
            || ' (₹' || a.amount || ' → ₹' || _new || ')',
          auth.uid())
  RETURNING id INTO t;

  UPDATE public.community_commission_allocations
     SET amount = _new,
         original_amount = COALESCE(original_amount, a.amount),
         revised_amount = a.amount,
         revision_count = COALESCE(revision_count, 0) + 1,
         revised_at = now(),
         updated_at = now()
   WHERE id = a.id;
  RETURN _new;
END
$$;

REVOKE ALL ON FUNCTION public.revise_commission_allocation(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_commission_allocation(uuid, numeric) TO postgres, authenticated, service_role;