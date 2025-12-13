import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SocialFeed } from "@/components/social/social-feed"
import { CreatePostDialog } from "@/components/social/create-post-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function SocialPage() {
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

    // Fetch posts
    const { data: posts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("scheduled_for", { ascending: true })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
                    <p className="text-muted-foreground">Schedule and manage your social media content</p>
                </div>
                <CreatePostDialog workspaceId={membership.workspace_id} />
            </div>

            <SocialFeed posts={posts || []} />
        </div>
    )
}
