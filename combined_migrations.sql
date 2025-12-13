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
