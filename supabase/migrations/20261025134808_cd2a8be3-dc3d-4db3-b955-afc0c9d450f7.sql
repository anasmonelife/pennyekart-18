CREATE TABLE public.account_verification_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  customer_user_id uuid NOT NULL,
  customer_mobile text NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_verification_links_customer ON public.account_verification_links (customer_user_id);
CREATE INDEX idx_account_verification_links_creator ON public.account_verification_links (created_by);

GRANT SELECT ON public.account_verification_links TO authenticated;
GRANT ALL ON public.account_verification_links TO service_role;

ALTER TABLE public.account_verification_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links they created"
  ON public.account_verification_links
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());