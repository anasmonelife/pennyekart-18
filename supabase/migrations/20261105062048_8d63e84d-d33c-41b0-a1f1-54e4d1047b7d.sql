ALTER TABLE public.community_access_requests ALTER COLUMN community_name DROP NOT NULL;

DROP FUNCTION public.request_community_access(text, text);

CREATE FUNCTION public.request_community_access() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 IF public.can_use_community() THEN RAISE EXCEPTION 'Community access is already enabled'; END IF;
 INSERT INTO public.community_access_requests(user_id,community_name,reason) VALUES(auth.uid(),NULL,NULL)
 ON CONFLICT(user_id) DO UPDATE SET status='pending',admin_notes=NULL,reviewed_by=NULL,reviewed_at=NULL
 WHERE community_access_requests.status <> 'pending' RETURNING id INTO _id;
 IF _id IS NULL THEN RAISE EXCEPTION 'Your request is already pending'; END IF;
 RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_community_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_community_access() TO authenticated;
