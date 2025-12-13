import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/settings/profile-form"
import { WorkspaceForm } from "@/components/settings/workspace-form"
import { TeamList } from "@/components/settings/team-list"

export default async function SettingsPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect("/auth/login")

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    // Get workspace membership
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .single()

    if (!membership) redirect("/onboarding")

    // Get workspace details
    const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", membership.workspace_id)
        .single()

    // Get team members
    const { data: members } = await supabase
        .from("workspace_members")
        .select(`
      id,
      workspace_id,
      role,
      user_id,
      created_at,
      profile:profiles(id, full_name, email, avatar_url)
    `)
        .eq("workspace_id", membership.workspace_id)

    // Get invites
    const { data: invites } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", membership.workspace_id)

        .eq("status", "pending")

    const formattedMembers = members?.map((member: any) => ({
        ...member,
        profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
    }))

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and workspace preferences</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="workspace">Workspace</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <ProfileForm profile={profile} />
                </TabsContent>

                <TabsContent value="workspace" className="space-y-4">
                    <WorkspaceForm workspace={workspace} />
                </TabsContent>

                <TabsContent value="team" className="space-y-4">
                    <TeamList
                        workspaceId={membership.workspace_id}
                        members={formattedMembers || []}
                        invites={invites || []}
                        currentUserRole={membership.role}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
