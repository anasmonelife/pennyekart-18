-- Admin-managed community actions, restricted to super admins server-side.

CREATE OR REPLACE FUNCTION public.admin_rename_community(_community_id uuid, _new_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text := btrim(_new_name);
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can rename communities';
  END IF;
  IF _name IS NULL OR _name = '' THEN
    RAISE EXCEPTION 'Community name cannot be empty';
  END IF;
  IF length(_name) > 100 THEN
    RAISE EXCEPTION 'Community name is too long (max 100 characters)';
  END IF;

  UPDATE public.communities
     SET name = _name, updated_at = now()
   WHERE id = _community_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community not found';
  END IF;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_community(_community_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can delete communities';
  END IF;

  SELECT name INTO _name FROM public.communities WHERE id = _community_id;
  IF _name IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  -- Keep the append-only payout ledger: detach from the community instead of deleting.
  UPDATE public.community_commission_allocations
     SET community_id = NULL, updated_at = now()
   WHERE community_id = _community_id;

  -- Cancel outstanding access requests tied to this community name.
  DELETE FROM public.community_access_requests WHERE community_name = _name;

  -- Members and invites cascade with the community row; clean them explicitly too.
  DELETE FROM public.community_members WHERE community_id = _community_id;
  DELETE FROM public.community_invites WHERE community_id = _community_id;
  DELETE FROM public.communities WHERE id = _community_id;

  RETURN true;
END;
$function$;

ALTER TABLE public.community_commission_allocations ALTER COLUMN community_id DROP NOT NULL;

GRANT EXECUTE ON FUNCTION public.admin_rename_community(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_community(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_rename_community(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_community(uuid) FROM anon, public;
