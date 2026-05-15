-- Schema for Custom Database UI (Baserow Alternative)

-- Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Tables
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schema_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Fields
CREATE TABLE IF NOT EXISTS public.fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  options_json JSONB DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;

-- Rows
CREATE TABLE IF NOT EXISTS public.rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  data_jsonb JSONB DEFAULT '{}'::jsonb,
  position SERIAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rows ENABLE ROW LEVEL SECURITY;

-- Views
CREATE TABLE IF NOT EXISTS public.views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters_json JSONB DEFAULT '[]'::jsonb,
  sorts_json JSONB DEFAULT '[]'::jsonb,
  hidden_fields_json JSONB DEFAULT '[]'::jsonb,
  row_height TEXT DEFAULT 'medium',
  column_widths_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.views ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- workspaces policies
CREATE POLICY "Users can view own workspaces" 
  ON public.workspaces FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own workspaces" 
  ON public.workspaces FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own workspaces" 
  ON public.workspaces FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own workspaces" 
  ON public.workspaces FOR DELETE 
  USING (auth.uid() = owner_id);

-- tables policies
CREATE POLICY "Users can view tables in own workspaces" 
  ON public.tables FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE workspaces.id = tables.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tables in own workspaces" 
  ON public.tables FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE workspaces.id = tables.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tables in own workspaces" 
  ON public.tables FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE workspaces.id = tables.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tables in own workspaces" 
  ON public.tables FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE workspaces.id = tables.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- fields policies
CREATE POLICY "Users can view fields of their tables" 
  ON public.fields FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = fields.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fields to their tables" 
  ON public.fields FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = fields.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fields of their tables" 
  ON public.fields FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = fields.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fields of their tables" 
  ON public.fields FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = fields.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- rows policies
CREATE POLICY "Users can view rows of their tables" 
  ON public.rows FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = rows.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rows to their tables" 
  ON public.rows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = rows.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rows of their tables" 
  ON public.rows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = rows.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rows of their tables" 
  ON public.rows FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = rows.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- views policies
CREATE POLICY "Users can view views of their tables" 
  ON public.views FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = views.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert views to their tables" 
  ON public.views FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = views.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update views of their tables" 
  ON public.views FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = views.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete views of their tables" 
  ON public.views FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      JOIN public.workspaces ON workspaces.id = tables.workspace_id 
      WHERE tables.id = views.table_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- change_logs table
CREATE TABLE IF NOT EXISTS public.change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fields;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_logs;

-- Realtime triggers (since updated_at isn't automatically updated without a trigger)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rows_updated_at ON public.rows;
CREATE TRIGGER rows_updated_at
BEFORE UPDATE ON public.rows
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
