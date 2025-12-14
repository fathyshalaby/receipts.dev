import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ContractsTable } from "@/components/contracts/contracts-table"
import { ContractsHeader } from "@/components/contracts/contracts-header"
import { EmptyWorkspaceState } from "@/components/dashboard/empty-workspace-state"

export default async function ContractsPage() {
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
                <ContractsHeader workspaceId="" clients={[]} />
                <EmptyWorkspaceState
                    title="No Contracts"
                    description="You need a workspace to manage contracts. Create one to get started."
                />
            </div>
        )
    }

    // Fetch contracts with client info
    const { data: contracts } = await supabase
        .from("contracts")
        .select(`
      *,
      client:clients(id, name, company)
    `)
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

    // Fetch clients for the dropdown
    const { data: clients } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("workspace_id", membership.workspace_id)
        .order("name")

    return (
        <div className="space-y-6">
            <ContractsHeader workspaceId={membership.workspace_id} clients={clients || []} />
            <ContractsTable
                contracts={contracts || []}
                workspaceId={membership.workspace_id}
                clients={clients || []}
            />
        </div>
    )
}
