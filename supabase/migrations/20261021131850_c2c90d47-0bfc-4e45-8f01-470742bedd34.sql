REVOKE EXECUTE ON FUNCTION public.request_commission_payout(NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_commission_payout(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_commission_payout(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_commission_payout(UUID, TEXT, TEXT) TO authenticated;