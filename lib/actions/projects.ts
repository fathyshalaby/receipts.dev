"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ProjectStatus, TaskPriority } from "@/lib/types/database"

interface ProjectFormData {
  name: string
  description: string
  client_id: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
}

interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  assigned_to: string | null
  due_date: string | null
}

export async function createProject(workspaceId: string, data: ProjectFormData) {
  const supabase = await createSupabaseClient()

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      ...data,
    })
    .select()
    .single()

  if (error) throw error

  // Create default task boards
  const defaultBoards = [
    { name: "To Do", position: 0 },
    { name: "In Progress", position: 1 },
    { name: "Review", position: 2 },
    { name: "Done", position: 3 },
  ]

  for (const board of defaultBoards) {
    await supabase.from("task_boards").insert({
      project_id: project.id,
      name: board.name,
      position: board.position,
    })
  }

  revalidatePath("/dashboard/projects")
  return project
}

export async function updateProject(projectId: string, data: Partial<ProjectFormData>) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("projects")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)

  if (error) throw error
  revalidatePath("/dashboard/projects")
}

export async function createTask(boardId: string, data: TaskFormData) {
  const supabase = await createSupabaseClient()

  // Get max position
  const { data: tasks } = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)

  const position = tasks && tasks.length > 0 ? tasks[0].position + 1 : 0

  const { error } = await supabase.from("tasks").insert({
    board_id: boardId,
    ...data,
    position,
    status: "todo",
  })

  if (error) throw error
  revalidatePath("/dashboard/projects")
}

export async function updateTask(taskId: string, data: Partial<TaskFormData>) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("tasks")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error
  revalidatePath("/dashboard/projects")
}

export async function deleteTask(taskId: string) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.from("tasks").delete().eq("id", taskId)

  if (error) throw error
  revalidatePath("/dashboard/projects")
}

export async function moveTask(taskId: string, newBoardId: string) {
  const supabase = await createSupabaseClient()

  // Get max position in new board
  const { data: tasks } = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", newBoardId)
    .order("position", { ascending: false })
    .limit(1)

  const position = tasks && tasks.length > 0 ? tasks[0].position + 1 : 0

  const { error } = await supabase
    .from("tasks")
    .update({
      board_id: newBoardId,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error
  revalidatePath("/dashboard/projects")
}
