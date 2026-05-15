CREATE TABLE IF NOT EXISTS public.change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert and view logs for now (can be restricted later based on workspaces if needed)
CREATE POLICY "Allow all to view change logs" 
  ON public.change_logs FOR SELECT 
  USING (true);

CREATE POLICY "Allow all to insert change logs" 
  ON public.change_logs FOR INSERT 
  WITH CHECK (true);
