-- Missing Data API grants: these tables had no privileges for anon/authenticated/service_role,
-- so direct reads (customer wallet Sales Commission tab, admin reporting, payout review) failed.

GRANT SELECT ON public.community_commission_allocations TO authenticated;
GRANT ALL ON public.community_commission_allocations TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.commission_payout_requests TO authenticated;
GRANT ALL ON public.commission_payout_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wallets TO authenticated;
GRANT ALL ON public.customer_wallets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wallet_transactions TO authenticated;
GRANT ALL ON public.customer_wallet_transactions TO service_role;