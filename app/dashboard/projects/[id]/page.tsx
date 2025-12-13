import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { KanbanBoard } from "@/components/projects/kanban-board"
import { ProjectHeader } from "@/components/projects/project-header"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Fetch project with client
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(id, name)
    `,
    )
    .eq("id", id)
    .single()

  if (error || !project) notFound()

  // Fetch task boards with tasks
  const { data: boards } = await supabase
    .from("task_boards")
    .select(
      `
      *,
      tasks:tasks(
        *,
        assignee:profiles(id, full_name, email, avatar_url)
      )
    `,
    )
    .eq("project_id", id)
    .order("position")

  // If no boards exist, create default ones
  if (!boards || boards.length === 0) {
    const defaultBoards = [
      { name: "To Do", position: 0 },
      { name: "In Progress", position: 1 },
      { name: "Review", position: 2 },
      { name: "Done", position: 3 },
    ]

    for (const board of defaultBoards) {
      await supabase.from("task_boards").insert({
        project_id: id,
        name: board.name,
        position: board.position,
      })
    }

    // Refetch boards after creation
    const { data: newBoards } = await supabase
      .from("task_boards")
      .select(
        `
        *,
        tasks:tasks(
          *,
          assignee:profiles(id, full_name, email, avatar_url)
        )
      `,
      )
      .eq("project_id", id)
      .order("position")

    return (
      <div className="flex h-full flex-col space-y-6">
        <ProjectHeader project={project} />
        <KanbanBoard projectId={id} boards={newBoards || []} />
      </div>
    )
  }

  // Fetch workspace members for task assignment
  const { data: members } = await supabase
    .from("workspace_members")
    .select(
      `
      user_id,
      profile:profiles(id, full_name, email, avatar_url)
    `,
    )
    .eq("workspace_id", project.workspace_id)

  return (
    <div className="flex h-full flex-col space-y-6">
      <ProjectHeader project={project} />
      <KanbanBoard projectId={id} boards={boards} members={members?.map((m) => m.profile).filter(Boolean) as never[]} />
    </div>
  )
}
