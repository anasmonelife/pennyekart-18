REVOKE EXECUTE ON FUNCTION public.can_use_community() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_community_access(text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_community_access(uuid,boolean,uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_community(text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_community_invite(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_community(text),public.respond_to_community_invite(uuid,boolean) TO authenticated;