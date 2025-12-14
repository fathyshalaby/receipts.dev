import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ClientsTable } from "@/components/clients/clients-table"
import { ClientsHeader } from "@/components/clients/clients-header"
import { EmptyWorkspaceState } from "@/components/dashboard/empty-workspace-state"

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Get workspace membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (!membership) {
    return (
      <div className="space-y-6">
        <ClientsHeader workspaceId="" />
        <EmptyWorkspaceState
          title="No Clients"
          description="You need a workspace to manage clients. Create one to get started."
        />
      </div>
    )
  }

  // Fetch clients
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <ClientsHeader workspaceId={membership.workspace_id} />
      <ClientsTable clients={clients || []} workspaceId={membership.workspace_id} />
    </div>
  )
}
