import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/settings/profile-form"
import { WorkspaceForm } from "@/components/settings/workspace-form"
import { TeamList } from "@/components/settings/team-list"
import { EmptyWorkspaceState } from "@/components/dashboard/empty-workspace-state"

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

    // Fetch workspace details and members ONLY if membership exists
    let workspace = null
    let formattedMembers: any[] = []
    let invites: any[] = []

    if (membership) {
        // Get workspace details
        const { data: wsData } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", membership.workspace_id)
            .single()
        workspace = wsData

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
        const { data: invitesData } = await supabase
            .from("workspace_invites")
            .select("*")
            .eq("workspace_id", membership.workspace_id)
            .eq("status", "pending")
        invites = invitesData || []

        formattedMembers = members?.map((member: any) => ({
            ...member,
            profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
        })) || []
    }

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
                    {membership && workspace ? (
                        <WorkspaceForm workspace={workspace} />
                    ) : (
                        <EmptyWorkspaceState
                            title="No Workspace Configuration"
                            description="You need to create a workspace to configure settings."
                        />
                    )}
                </TabsContent>

                <TabsContent value="team" className="space-y-4">
                    {membership ? (
                        <TeamList
                            workspaceId={membership.workspace_id}
                            members={formattedMembers}
                            invites={invites}
                            currentUserRole={membership.role}
                        />
                    ) : (
                        <EmptyWorkspaceState
                            title="No Team Members"
                            description="You need to create a workspace to invite team members."
                        />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
