DO $$ BEGIN
    CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'signed', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS contracts (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  title text not null,
  content text,
  status contract_status default 'draft',
  value numeric(10, 2),
  start_date date,
  end_date date,
  signed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table contracts enable row level security;

DO $$ BEGIN
  create policy "Users can view contracts in their workspaces"
    on contracts for select
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = contracts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can insert contracts in their workspaces"
    on contracts for insert
    with check (
      exists (
        select 1 from workspace_members
        where workspace_id = contracts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can update contracts in their workspaces"
    on contracts for update
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = contracts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can delete contracts in their workspaces"
    on contracts for delete
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = contracts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
