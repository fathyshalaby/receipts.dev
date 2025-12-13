import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectsHeader } from "@/components/projects/projects-header"
import { ProjectsGrid } from "@/components/projects/projects-grid"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (!membership) redirect("/onboarding")

  // Fetch projects with client info
  const { data: projects } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(id, name)
    `,
    )
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })

  // Fetch clients for the new project form
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("workspace_id", membership.workspace_id)
    .order("name")

  return (
    <div className="space-y-6">
      <ProjectsHeader workspaceId={membership.workspace_id} clients={clients || []} />
      <ProjectsGrid projects={projects || []} workspaceId={membership.workspace_id} clients={clients || []} />
    </div>
  )
}
