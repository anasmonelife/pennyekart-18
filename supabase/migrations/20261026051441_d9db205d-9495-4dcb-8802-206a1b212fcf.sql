CREATE OR REPLACE FUNCTION public.respond_to_community_invite(_invite_id uuid, _accept boolean)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT * INTO _inv
  FROM public.community_invites
  WHERE id = _invite_id
    AND status = 'pending'
    AND invited_mobile = public.my_normalized_mobile()
  FOR UPDATE;

  IF _inv.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already handled';
  END IF;

  IF NOT _accept THEN
    UPDATE public.community_invites SET status = 'declined' WHERE id = _inv.id;
    RETURN false;
  END IF;

  IF NOT public.am_i_verified() THEN
    RAISE EXCEPTION 'Please verify your account first';
  END IF;

  IF EXISTS(SELECT 1 FROM public.communities WHERE creator_user_id = _uid) THEN
    RAISE EXCEPTION 'You own a community, so you cannot join another one';
  END IF;

  IF EXISTS(SELECT 1 FROM public.community_members WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'You already belong to a community';
  END IF;

  INSERT INTO public.community_members(community_id, user_id) VALUES(_inv.community_id, _uid);
  UPDATE public.community_invites SET status = 'accepted' WHERE id = _inv.id;
  RETURN true;
END;
$$;