import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { WorkspaceProvider } from "@/components/providers/workspace-provider"

async function getWorkspaceData(userId: string) {
  const supabase = await createClient()

  // Get user's workspace memberships with workspace details
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      workspace:workspaces(*)
    `,
    )
    .eq("user_id", userId)

  if (error || !memberships || memberships.length === 0) {
    return null
  }

  return memberships
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const memberships = await getWorkspaceData(user.id)

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }))

  // Use first workspace as default active
  const activeWorkspace = workspaces[0]

  return (
    <WorkspaceProvider workspaces={workspaces} initialWorkspace={activeWorkspace} profile={profile}>
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
