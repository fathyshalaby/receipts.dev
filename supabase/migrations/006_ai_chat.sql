CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null, -- user, assistant
  content text not null,
  created_at timestamptz default now()
);

-- RLS Policies
alter table chat_messages enable row level security;

DO $$ BEGIN
  create policy "Users can view chat messages in their workspaces"
    on chat_messages for select
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = chat_messages.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can insert chat messages in their workspaces"
    on chat_messages for insert
    with check (
      exists (
        select 1 from workspace_members
        where workspace_id = chat_messages.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
