DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS workspace_invites (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  email text not null,
  role text not null default 'member',
  status invite_status default 'pending',
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table workspace_invites enable row level security;

DO $$ BEGIN
  create policy "Users can view invites in their workspaces"
    on workspace_invites for select
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = workspace_invites.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can insert invites in their workspaces"
    on workspace_invites for insert
    with check (
      exists (
        select 1 from workspace_members
        where workspace_id = workspace_invites.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can delete invites in their workspaces"
    on workspace_invites for delete
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = workspace_invites.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
