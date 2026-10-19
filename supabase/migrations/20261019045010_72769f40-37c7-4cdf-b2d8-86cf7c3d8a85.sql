CREATE TABLE public.community_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE,
 community_name text NOT NULL, reason text, status text NOT NULL DEFAULT 'pending',
 admin_notes text, reviewed_by uuid, reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_access_requests TO authenticated;
GRANT ALL ON public.community_access_requests TO service_role;
ALTER TABLE public.community_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_access_request_reads ON public.community_access_requests FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_super_admin() OR public.has_permission('read_users'));
CREATE TRIGGER community_access_requests_updated BEFORE UPDATE ON public.community_access_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES public.roles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_reads ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_super_admin() OR public.has_permission('read_users'));
CREATE TRIGGER user_roles_updated BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION public.can_use_community() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.user_id JOIN public.roles r ON r.id=coalesce(ur.role_id,p.role_id) WHERE p.user_id=auth.uid() AND lower(trim(r.name)) IN ('coordinator','group leader','pro'));
$$;
REVOKE ALL ON FUNCTION public.can_use_community() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_community() TO authenticated;

CREATE FUNCTION public.request_community_access(_community_name text, _reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 IF public.can_use_community() THEN RAISE EXCEPTION 'Community access is already enabled'; END IF;
 IF length(trim(coalesce(_community_name,''))) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Enter a community name (up to 60 characters)'; END IF;
 INSERT INTO public.community_access_requests(user_id,community_name,reason) VALUES(auth.uid(),trim(_community_name),nullif(trim(_reason),''))
 ON CONFLICT(user_id) DO UPDATE SET community_name=excluded.community_name,reason=excluded.reason,status='pending',admin_notes=NULL,reviewed_by=NULL,reviewed_at=NULL
 WHERE community_access_requests.status <> 'pending' RETURNING id INTO _id;
 IF _id IS NULL THEN RAISE EXCEPTION 'Your request is already pending'; END IF;
 RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_community_access(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_community_access(text,text) TO authenticated;

CREATE FUNCTION public.review_community_access(_request_id uuid, _approve boolean, _role_id uuid DEFAULT NULL, _notes text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _request public.community_access_requests;
BEGIN
 IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only a super administrator can change roles and activate community access'; END IF;
 SELECT * INTO _request FROM public.community_access_requests WHERE id=_request_id FOR UPDATE;
 IF NOT FOUND OR _request.status <> 'pending' THEN RAISE EXCEPTION 'Pending request not found'; END IF;
 IF _approve THEN
  IF NOT EXISTS(SELECT 1 FROM public.roles WHERE id=_role_id AND lower(trim(name)) IN ('coordinator','group leader','pro')) THEN RAISE EXCEPTION 'Choose Coordinator, Group Leader, or Pro'; END IF;
  INSERT INTO public.user_roles(user_id,role_id) VALUES(_request.user_id,_role_id) ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id;
 END IF;
 UPDATE public.community_access_requests SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,admin_notes=nullif(trim(_notes),''),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_request_id;
END; $$;
REVOKE ALL ON FUNCTION public.review_community_access(uuid,boolean,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_community_access(uuid,boolean,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_community(_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF NOT public.can_use_community() THEN RAISE EXCEPTION 'Request community access from an administrator first'; END IF;
 IF NOT public.am_i_verified() THEN RAISE EXCEPTION 'Please verify your account first'; END IF;
 IF coalesce(trim(_name),'')='' THEN RAISE EXCEPTION 'Community name is required'; END IF;
 IF EXISTS(SELECT 1 FROM public.community_members WHERE user_id=_uid) THEN RAISE EXCEPTION 'You already belong to a community'; END IF;
 INSERT INTO public.communities(name,creator_user_id) VALUES(trim(_name),_uid) RETURNING id INTO _id;
 INSERT INTO public.community_members(community_id,user_id) VALUES(_id,_uid);
 RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.respond_to_community_invite(_invite_id uuid,_accept boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _inv record;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 SELECT * INTO _inv FROM public.community_invites WHERE id=_invite_id AND status='pending' AND invited_mobile=public.my_normalized_mobile() FOR UPDATE;
 IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invite not found or already handled'; END IF;
 IF NOT _accept THEN UPDATE public.community_invites SET status='declined' WHERE id=_inv.id; RETURN false; END IF;
 IF NOT public.can_use_community() THEN RAISE EXCEPTION 'Request community access from an administrator first'; END IF;
 IF NOT public.am_i_verified() THEN RAISE EXCEPTION 'Please verify your account first'; END IF;
 IF EXISTS(SELECT 1 FROM public.community_members WHERE user_id=_uid) THEN RAISE EXCEPTION 'You already belong to a community'; END IF;
 INSERT INTO public.community_members(community_id,user_id) VALUES(_inv.community_id,_uid);
 UPDATE public.community_invites SET status='accepted' WHERE id=_inv.id;
 RETURN true;
END; $$;
CREATE POLICY community_eligible_creation ON public.communities AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.can_use_community());
CREATE POLICY community_eligible_membership ON public.community_members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.can_use_community());
CREATE POLICY community_eligible_invites ON public.community_invites AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.can_use_community());