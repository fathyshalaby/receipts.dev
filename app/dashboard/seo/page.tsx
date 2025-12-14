import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SeoDashboard } from "@/components/seo/seo-dashboard"
import { EmptyWorkspaceState } from "@/components/dashboard/empty-workspace-state"

export default async function SeoPage() {
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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SEO Tools</h1>
                    <p className="text-muted-foreground">Track rankings and audit your sites</p>
                </div>
                <EmptyWorkspaceState
                    title="SEO Tools Unavailable"
                    description="You need a workspace to use SEO tools. Create one to get started."
                />
            </div>
        )
    }

    // Fetch keywords
    const { data: keywords } = await supabase
        .from("seo_keywords")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

    // Fetch audits
    const { data: audits } = await supabase
        .from("seo_audits")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SEO Tools</h1>
                <p className="text-muted-foreground">Track rankings and audit your sites</p>
            </div>
            <SeoDashboard
                workspaceId={membership.workspace_id}
                keywords={keywords || []}
                audits={audits || []}
            />
        </div>
    )
}
