export type UserRole = "owner" | "admin" | "member"
export type ClientStatus = "lead" | "prospect" | "active" | "inactive"
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
export type TaskStatus = "todo" | "in_progress" | "review" | "done"
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"
export type ContractStatus = "draft" | "sent" | "signed" | "expired" | "cancelled"
export type SocialPlatform = "twitter" | "facebook" | "instagram" | "linkedin"
export type SocialPostStatus = "draft" | "scheduled" | "published" | "failed"
export type AIGenerationType = "social_post" | "email" | "contract_clause" | "blog" | "other"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  created_at: string
  profile?: Profile
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: ClientStatus
  website: string | null
  address: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  workspace_id: string
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface TaskBoard {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  board_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface Invoice {
  id: string
  workspace_id: string
  client_id: string
  project_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  client?: Client
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface ShortLink {
  id: string
  workspace_id: string
  short_code: string
  original_url: string
  title: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  clicks: number
  is_active: boolean
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LinkClick {
  id: string
  link_id: string
  ip_address: string | null
  user_agent: string | null
  referer: string | null
  country: string | null
  city: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  clicked_at: string
}
