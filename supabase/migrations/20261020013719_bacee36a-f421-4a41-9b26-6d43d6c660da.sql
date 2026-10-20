CREATE TABLE public.commission_allocation_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_key text NOT NULL,
  period_from timestamptz,
  period_to timestamptz,
  people jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_tables text[] NOT NULL DEFAULT '{}',
  total_profit numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.commission_allocation_snapshots TO authenticated;
GRANT ALL ON public.commission_allocation_snapshots TO service_role;
ALTER TABLE public.commission_allocation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read commission allocations" ON public.commission_allocation_snapshots
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admins save commission allocations" ON public.commission_allocation_snapshots
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admins delete commission allocations" ON public.commission_allocation_snapshots
  FOR DELETE TO authenticated USING (public.is_super_admin());
CREATE INDEX commission_allocation_snapshots_period_idx ON public.commission_allocation_snapshots (period_key, created_at DESC);
CREATE TRIGGER update_commission_allocation_snapshots_updated_at BEFORE UPDATE ON public.commission_allocation_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();