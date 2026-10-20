CREATE TABLE public.community_commission_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 community_id uuid NOT NULL REFERENCES public.communities(id),
 community_name text NOT NULL,
 customer_user_id uuid NOT NULL,
 period_from date NOT NULL,
 period_to date NOT NULL,
 total_profit numeric NOT NULL,
 commission_rate numeric NOT NULL,
 calculated_commission numeric NOT NULL,
 amount numeric NOT NULL,
 wallet_transaction_id uuid NOT NULL REFERENCES public.customer_wallet_transactions(id),
 allocated_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_commission_allocations TO authenticated;
GRANT ALL ON public.community_commission_allocations TO service_role;
ALTER TABLE public.community_commission_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own commission payments or super admin" ON public.community_commission_allocations FOR SELECT TO authenticated USING (customer_user_id = auth.uid() OR public.is_super_admin());
CREATE INDEX community_commission_allocations_period_idx ON public.community_commission_allocations(community_id, period_from, period_to);
CREATE INDEX community_commission_allocations_customer_idx ON public.community_commission_allocations(customer_user_id, created_at DESC);
CREATE TRIGGER update_community_commission_allocations_updated_at BEFORE UPDATE ON public.community_commission_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.allocate_community_commission(_community_id uuid, _from date, _to date, _amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 c public.communities%ROWTYPE; summary record; role_id uuid; rules jsonb; rule jsonb;
 rate numeric; computed numeric; payment numeric; wallet_id uuid; tx_id uuid; allocation_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only super administrators can allocate commission'; END IF;
 IF _from IS NULL OR _to IS NULL OR _to < _from OR _to > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Choose a valid period ending today or earlier'; END IF;
 SELECT * INTO c FROM public.communities WHERE id = _community_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Community not found'; END IF;
 IF EXISTS (SELECT 1 FROM public.community_commission_allocations a WHERE a.community_id = c.id AND a.period_from <= _to AND a.period_to >= _from) THEN RAISE EXCEPTION 'Commission already allocated for an overlapping period'; END IF;
 SELECT * INTO summary FROM public.get_community_revenue_summary((_from::timestamp AT TIME ZONE 'Asia/Kolkata'), ((_to + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') - interval '1 microsecond') WHERE community_id = c.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Community profit unavailable'; END IF;
 SELECT coalesce((SELECT ur.role_id FROM public.user_roles ur WHERE ur.user_id = c.creator_user_id ORDER BY ur.created_at DESC LIMIT 1), p.role_id) INTO role_id FROM public.profiles p WHERE p.user_id = c.creator_user_id;
 SELECT coalesce(value::numeric, 0) INTO rate FROM public.app_settings WHERE key = 'community_creator_commission_percent';
 rate := coalesce(rate, 0);
 SELECT value::jsonb INTO rules FROM public.app_settings WHERE key = 'community_creator_commission_rules';
 rule := rules -> role_id::text;
 IF rule IS NOT NULL AND (rule->>'minimum')::numeric >= 0 AND (rule->>'maximum')::numeric <= 100 AND (rule->>'rate')::numeric BETWEEN (rule->>'minimum')::numeric AND (rule->>'maximum')::numeric THEN rate := (rule->>'rate')::numeric; END IF;
 IF rate < 0 OR rate > 100 THEN RAISE EXCEPTION 'Invalid saved commission rate'; END IF;
 computed := round(greatest(summary.profit, 0) * rate / 100, 2);
 payment := round(coalesce(_amount, computed), 2);
 IF payment IS NULL OR payment <= 0 OR payment::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Commission amount must be positive'; END IF;
 INSERT INTO public.customer_wallets(customer_user_id, balance) VALUES(c.creator_user_id, 0) ON CONFLICT (customer_user_id) DO NOTHING;
 UPDATE public.customer_wallets SET balance = balance + payment, updated_at = now() WHERE customer_user_id = c.creator_user_id RETURNING id INTO wallet_id;
 INSERT INTO public.customer_wallet_transactions(wallet_id, customer_user_id, type, amount, description, created_by) VALUES(wallet_id, c.creator_user_id, 'credit', payment, 'Sales commission · ' || c.name || ' · ' || _from || ' to ' || _to, auth.uid()) RETURNING id INTO tx_id;
 INSERT INTO public.community_commission_allocations(community_id, community_name, customer_user_id, period_from, period_to, total_profit, commission_rate, calculated_commission, amount, wallet_transaction_id, allocated_by) VALUES(c.id,c.name,c.creator_user_id,_from,_to,summary.profit,rate,computed,payment,tx_id,auth.uid()) RETURNING id INTO allocation_id;
 RETURN allocation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_community_commission(uuid,date,date,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_community_commission(uuid,date,date,numeric) TO authenticated, service_role;