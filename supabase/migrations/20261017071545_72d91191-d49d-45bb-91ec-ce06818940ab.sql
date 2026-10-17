CREATE OR REPLACE FUNCTION public.prevent_client_delivery_contact_attempt_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.delivery_contact_attempted_at IS DISTINCT FROM OLD.delivery_contact_attempted_at THEN
    RAISE EXCEPTION 'Delivery contact attempts can only be recorded by the server';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_delivery_contact_attempt_timestamp ON public.orders;
CREATE TRIGGER protect_delivery_contact_attempt_timestamp
BEFORE UPDATE OF delivery_contact_attempted_at ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_delivery_contact_attempt_change();