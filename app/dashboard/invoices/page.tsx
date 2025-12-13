import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { InvoicesHeader } from "@/components/invoices/invoices-header"

export default async function InvoicesPage() {
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

    if (!membership) redirect("/onboarding")

    // Fetch invoices with client info
    const { data: invoices } = await supabase
        .from("invoices")
        .select(`
      *,
      client:clients(id, name, email, company)
    `)
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

    // Fetch clients for the dropdown
    const { data: clients } = await supabase
        .from("clients")
        .select("id, name, email, company")
        .eq("workspace_id", membership.workspace_id)
        .order("name")

    // Fetch projects for the dropdown
    const { data: projects } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .eq("workspace_id", membership.workspace_id)
        .order("name")

    return (
        <div className="space-y-6">
            <InvoicesHeader
                workspaceId={membership.workspace_id}
                clients={clients || []}
                projects={projects || []}
            />
            <InvoicesTable
                invoices={invoices || []}
                workspaceId={membership.workspace_id}
                clients={clients || []}
                projects={projects || []}
            />
        </div>
    )
}
