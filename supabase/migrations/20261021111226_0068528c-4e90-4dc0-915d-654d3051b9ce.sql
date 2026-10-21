ALTER TABLE public.community_commission_allocations
  ALTER COLUMN customer_user_id DROP NOT NULL,
  ALTER COLUMN wallet_transaction_id DROP NOT NULL,
  ALTER COLUMN allocated_by DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'creator',
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_mobile text,
  ADD COLUMN IF NOT EXISTS elife_person_id text,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'allocated',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS allocated_at timestamptz;
UPDATE public.community_commission_allocations SET allocated_at = created_at WHERE allocated_at IS NULL AND status = 'allocated';
ALTER TABLE public.community_commission_allocations ALTER COLUMN status SET DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.validate_commission_allocation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.recipient_type NOT IN ('creator','coordinator','team_leader','super_admin') THEN RAISE EXCEPTION 'Invalid recipient type'; END IF;
  IF NEW.status NOT IN ('pending','verified','allocated') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_commission_allocation ON public.community_commission_allocations;
CREATE TRIGGER validate_commission_allocation BEFORE INSERT OR UPDATE ON public.community_commission_allocations FOR EACH ROW EXECUTE FUNCTION public.validate_commission_allocation();

DROP FUNCTION IF EXISTS public.allocate_community_commission(uuid, date, date, numeric);

-- Save calculated rows as pending (replaces earlier unallocated rows for the same period)
CREATE OR REPLACE FUNCTION public.save_commission_allocation_rows(_from date, _to date, _rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; n integer := 0; uid uuid; mob text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super admins can save allocations'; END IF;
  IF _from IS NULL OR _to IS NULL OR _from > _to OR _to > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Invalid period'; END IF;
  DELETE FROM public.community_commission_allocations WHERE period_from = _from AND period_to = _to AND status <> 'allocated';
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    uid := NULLIF(r->>'customer_user_id','')::uuid;
    mob := right(regexp_replace(coalesce(r->>'recipient_mobile',''), '\D', '', 'g'), 10);
    IF uid IS NULL AND length(mob) = 10 THEN
      SELECT p.user_id INTO uid FROM public.profiles p
       WHERE right(regexp_replace(coalesce(p.mobile_number,''), '\D', '', 'g'), 10) = mob
       ORDER BY p.created_at LIMIT 1;
    END IF;
    -- skip anything already paid for an overlapping period
    IF EXISTS (SELECT 1 FROM public.community_commission_allocations a
      WHERE a.status = 'allocated' AND a.community_id = (r->>'community_id')::uuid
        AND a.recipient_type = r->>'recipient_type'
        AND coalesce(a.elife_person_id, a.customer_user_id::text, '') = coalesce(r->>'elife_person_id', uid::text, '')
        AND a.period_from <= _to AND a.period_to >= _from) THEN CONTINUE; END IF;
    INSERT INTO public.community_commission_allocations(community_id, community_name, customer_user_id, period_from, period_to,
      total_profit, commission_rate, calculated_commission, amount, recipient_type, recipient_name, recipient_mobile, elife_person_id, share_count, status)
    VALUES ((r->>'community_id')::uuid, r->>'community_name', uid, _from, _to,
      coalesce((r->>'total_profit')::numeric,0), coalesce((r->>'commission_rate')::numeric,0),
      round(coalesce((r->>'calculated_commission')::numeric,0),2), round(coalesce((r->>'calculated_commission')::numeric,0),2),
      r->>'recipient_type', r->>'recipient_name', r->>'recipient_mobile', NULLIF(r->>'elife_person_id',''),
      greatest(coalesce((r->>'share_count')::int,1),1), 'pending');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.verify_commission_allocation(_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super admins can verify'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  UPDATE public.community_commission_allocations SET amount = round(_amount,2), status = 'verified', verified_at = now()
   WHERE id = _id AND status <> 'allocated';
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found or already paid'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.allocate_commission_row(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.community_commission_allocations%ROWTYPE; w uuid; t uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super admins can allocate'; END IF;
  SELECT * INTO a FROM public.community_commission_allocations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  IF a.status <> 'verified' THEN RAISE EXCEPTION 'Verify this row before allocating'; END IF;
  IF a.customer_user_id IS NULL THEN RAISE EXCEPTION 'No Pennyekart account linked to this person'; END IF;
  PERFORM 1 FROM public.communities WHERE id = a.community_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.community_commission_allocations x WHERE x.id <> a.id AND x.status = 'allocated'
     AND x.community_id = a.community_id AND x.recipient_type = a.recipient_type AND x.customer_user_id = a.customer_user_id
     AND x.period_from <= a.period_to AND x.period_to >= a.period_from) THEN
    RAISE EXCEPTION 'Already allocated for an overlapping period';
  END IF;
  INSERT INTO public.customer_wallets(customer_user_id) VALUES (a.customer_user_id) ON CONFLICT (customer_user_id) DO NOTHING;
  UPDATE public.customer_wallets SET balance = balance + a.amount, updated_at = now() WHERE customer_user_id = a.customer_user_id RETURNING id INTO w;
  INSERT INTO public.customer_wallet_transactions(wallet_id, customer_user_id, type, amount, description, created_by)
  VALUES (w, a.customer_user_id, 'credit', a.amount,
    'Sales commission · ' || a.community_name || ' · ' || a.period_from || ' to ' || a.period_to, auth.uid())
  RETURNING id INTO t;
  UPDATE public.community_commission_allocations SET status = 'allocated', wallet_transaction_id = t, allocated_by = auth.uid(), allocated_at = now() WHERE id = a.id;
  RETURN t;
END $$;

REVOKE ALL ON FUNCTION public.save_commission_allocation_rows(date,date,jsonb), public.verify_commission_allocation(uuid,numeric), public.allocate_commission_row(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_commission_allocation_rows(date,date,jsonb), public.verify_commission_allocation(uuid,numeric), public.allocate_commission_row(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Owners see own allocated commission" ON public.community_commission_allocations;