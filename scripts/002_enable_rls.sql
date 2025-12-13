-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to see profiles of workspace members
CREATE POLICY "profiles_select_workspace_members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

CREATE POLICY "workspaces_select_member" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_insert_authenticated" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspaces_update_admin" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspaces_delete_owner" ON workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- =====================================================
-- WORKSPACE MEMBERS POLICIES
-- =====================================================

CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_admin" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspace_members.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR user_id = auth.uid() -- Allow self-insert for workspace creation
  );

CREATE POLICY "workspace_members_update_admin" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_delete_admin" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- HELPER FUNCTION: Check workspace membership
-- =====================================================

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================

CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- CLIENT NOTES POLICIES
-- =====================================================

CREATE POLICY "client_notes_select" ON client_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_notes.client_id AND is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "client_notes_insert" ON client_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_notes.client_id AND is_workspace_member(c.workspace_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "client_notes_delete" ON client_notes
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- TASK BOARDS POLICIES
-- =====================================================

CREATE POLICY "task_boards_select" ON task_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_boards.project_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "task_boards_insert" ON task_boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_boards.project_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "task_boards_update" ON task_boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_boards.project_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "task_boards_delete" ON task_boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_boards.project_id AND is_workspace_admin(p.workspace_id)
    )
  );

-- =====================================================
-- TASKS POLICIES
-- =====================================================

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_boards tb
      JOIN projects p ON p.id = tb.project_id
      WHERE tb.id = tasks.board_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_boards tb
      JOIN projects p ON p.id = tb.project_id
      WHERE tb.id = tasks.board_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM task_boards tb
      JOIN projects p ON p.id = tb.project_id
      WHERE tb.id = tasks.board_id AND is_workspace_member(p.workspace_id)
    )
  );

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM task_boards tb
      JOIN projects p ON p.id = tb.project_id
      WHERE tb.id = tasks.board_id AND is_workspace_member(p.workspace_id)
    )
  );

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- INVOICE ITEMS POLICIES
-- =====================================================

CREATE POLICY "invoice_items_select" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id AND is_workspace_member(i.workspace_id)
    )
  );

CREATE POLICY "invoice_items_insert" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id AND is_workspace_member(i.workspace_id)
    )
  );

CREATE POLICY "invoice_items_update" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id AND is_workspace_member(i.workspace_id)
    )
  );

CREATE POLICY "invoice_items_delete" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id AND is_workspace_member(i.workspace_id)
    )
  );

-- =====================================================
-- CONTRACT TEMPLATES POLICIES
-- =====================================================

CREATE POLICY "contract_templates_select" ON contract_templates
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "contract_templates_insert" ON contract_templates
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "contract_templates_update" ON contract_templates
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "contract_templates_delete" ON contract_templates
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- CONTRACTS POLICIES
-- =====================================================

CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- SOCIAL ACCOUNTS POLICIES
-- =====================================================

CREATE POLICY "social_accounts_select" ON social_accounts
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "social_accounts_insert" ON social_accounts
  FOR INSERT WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "social_accounts_update" ON social_accounts
  FOR UPDATE USING (is_workspace_admin(workspace_id));

CREATE POLICY "social_accounts_delete" ON social_accounts
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- =====================================================
-- SOCIAL POSTS POLICIES
-- =====================================================

CREATE POLICY "social_posts_select" ON social_posts
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "social_posts_insert" ON social_posts
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "social_posts_update" ON social_posts
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "social_posts_delete" ON social_posts
  FOR DELETE USING (is_workspace_member(workspace_id));

-- =====================================================
-- KEYWORDS POLICIES
-- =====================================================

CREATE POLICY "keywords_select" ON keywords
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "keywords_insert" ON keywords
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "keywords_update" ON keywords
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "keywords_delete" ON keywords
  FOR DELETE USING (is_workspace_member(workspace_id));

-- =====================================================
-- KEYWORD RANKINGS POLICIES
-- =====================================================

CREATE POLICY "keyword_rankings_select" ON keyword_rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keywords k
      WHERE k.id = keyword_rankings.keyword_id AND is_workspace_member(k.workspace_id)
    )
  );

CREATE POLICY "keyword_rankings_insert" ON keyword_rankings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keywords k
      WHERE k.id = keyword_rankings.keyword_id AND is_workspace_member(k.workspace_id)
    )
  );

-- =====================================================
-- SHORT LINKS POLICIES
-- =====================================================

CREATE POLICY "short_links_select" ON short_links
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "short_links_insert" ON short_links
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "short_links_update" ON short_links
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "short_links_delete" ON short_links
  FOR DELETE USING (is_workspace_member(workspace_id));

-- =====================================================
-- LINK CLICKS POLICIES (Public insert for tracking)
-- =====================================================

CREATE POLICY "link_clicks_select" ON link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM short_links sl
      WHERE sl.id = link_clicks.link_id AND is_workspace_member(sl.workspace_id)
    )
  );

-- Allow public inserts for click tracking (no auth required)
CREATE POLICY "link_clicks_insert_public" ON link_clicks
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- AI GENERATIONS POLICIES
-- =====================================================

CREATE POLICY "ai_generations_select" ON ai_generations
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "ai_generations_insert" ON ai_generations
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id) AND user_id = auth.uid());
