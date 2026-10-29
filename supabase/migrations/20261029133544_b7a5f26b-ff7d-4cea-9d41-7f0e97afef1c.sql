ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION public.create_community(_name text, _description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF NOT public.can_use_community() THEN RAISE EXCEPTION 'Request community access from an administrator first'; END IF;
 IF NOT public.am_i_verified() THEN RAISE EXCEPTION 'Please verify your account first'; END IF;
 IF coalesce(trim(_name),'')='' THEN RAISE EXCEPTION 'Community name is required'; END IF;
 IF EXISTS(SELECT 1 FROM public.community_members WHERE user_id=_uid) THEN RAISE EXCEPTION 'You already belong to a community'; END IF;
 INSERT INTO public.communities(name,description,creator_user_id) VALUES(trim(_name),nullif(coalesce(trim(_description),''),''),_uid) RETURNING id INTO _id;
 INSERT INTO public.community_members(community_id,user_id) VALUES(_id,_uid);
 RETURN _id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_community(text,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.create_community(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_community(text,text) TO authenticated;
GRANT SELECT, UPDATE (name, description, updated_at) ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
CREATE OR REPLACE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()