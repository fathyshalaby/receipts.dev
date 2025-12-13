create type keyword_status as enum ('active', 'paused', 'archived');
create type audit_status as enum ('running', 'completed', 'failed');

create table seo_keywords (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  keyword text not null,
  url text not null,
  position int,
  change int default 0,
  volume int,
  difficulty int,
  status keyword_status default 'active',
  last_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table seo_audits (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  url text not null,
  score int,
  issues_count int default 0,
  status audit_status default 'running',
  report jsonb,
  created_at timestamptz default now()
);

-- RLS Policies
alter table seo_keywords enable row level security;
alter table seo_audits enable row level security;

create policy "Users can view keywords in their workspaces"
  on seo_keywords for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_keywords.workspace_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert keywords in their workspaces"
  on seo_keywords for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_keywords.workspace_id
      and user_id = auth.uid()
    )
  );

create policy "Users can update keywords in their workspaces"
  on seo_keywords for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_keywords.workspace_id
      and user_id = auth.uid()
    )
  );

create policy "Users can delete keywords in their workspaces"
  on seo_keywords for delete
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_keywords.workspace_id
      and user_id = auth.uid()
    )
  );

-- Same for audits
create policy "Users can view audits in their workspaces"
  on seo_audits for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_audits.workspace_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert audits in their workspaces"
  on seo_audits for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_id = seo_audits.workspace_id
      and user_id = auth.uid()
    )
  );
