GRANT SELECT ON public.community_access_requests TO authenticated;
GRANT ALL ON public.community_access_requests TO service_role;

GRANT SELECT, INSERT ON public.commission_payout_requests TO authenticated;
GRANT ALL ON public.commission_payout_requests TO service_role;

GRANT SELECT ON public.community_commission_allocations TO authenticated;
GRANT ALL ON public.community_commission_allocations TO service_role;