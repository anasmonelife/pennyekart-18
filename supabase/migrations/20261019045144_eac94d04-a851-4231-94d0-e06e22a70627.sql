CREATE FUNCTION public.sync_existing_user_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
  IF NEW.role_id IS NULL THEN DELETE FROM public.user_roles WHERE user_id=NEW.user_id;
  ELSE INSERT INTO public.user_roles(user_id,role_id) VALUES(NEW.user_id,NEW.role_id) ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.sync_existing_user_role() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_existing_user_role AFTER UPDATE OF role_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_existing_user_role();
CREATE OR REPLACE FUNCTION public.has_permission(_permission_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.user_id JOIN public.role_permissions rp ON rp.role_id=coalesce(ur.role_id,p.role_id) JOIN public.permissions perm ON perm.id=rp.permission_id WHERE p.user_id=auth.uid() AND perm.name=_permission_name);
$$;