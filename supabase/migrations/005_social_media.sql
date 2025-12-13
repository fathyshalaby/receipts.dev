CREATE TABLE IF NOT EXISTS social_posts (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  platform text not null, -- twitter, facebook, linkedin, instagram
  content text not null,
  media_url text,
  scheduled_for timestamptz not null,
  status text default 'scheduled', -- scheduled, published, failed, draft
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table social_posts enable row level security;

DO $$ BEGIN
  create policy "Users can view social posts in their workspaces"
    on social_posts for select
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = social_posts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can insert social posts in their workspaces"
    on social_posts for insert
    with check (
      exists (
        select 1 from workspace_members
        where workspace_id = social_posts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can update social posts in their workspaces"
    on social_posts for update
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = social_posts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can delete social posts in their workspaces"
    on social_posts for delete
    using (
      exists (
        select 1 from workspace_members
        where workspace_id = social_posts.workspace_id
        and user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
