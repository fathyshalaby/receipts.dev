import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LinksTable } from "@/components/links/links-table"
import { LinksHeader } from "@/components/links/links-header"
import { EmptyWorkspaceState } from "@/components/dashboard/empty-workspace-state"

export default async function LinksPage() {
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
                <LinksHeader workspaceId="" />
                <EmptyWorkspaceState
                    title="No Links"
                    description="You need a workspace to manage short links. Create one to get started."
                />
            </div>
        )
    }

    // Fetch links
    const { data: links } = await supabase
        .from("short_links")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

    return (
        <div className="space-y-6">
            <LinksHeader workspaceId={membership.workspace_id} />
            <LinksTable links={links || []} workspaceId={membership.workspace_id} />
        </div>
    )
}
