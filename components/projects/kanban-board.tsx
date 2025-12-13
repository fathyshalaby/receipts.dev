"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { TaskBoard, Task, Profile } from "@/lib/types/database"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Calendar, GripVertical } from "lucide-react"
import { TaskDialog } from "@/components/projects/task-dialog"
import { moveTask } from "@/lib/actions/projects"

interface BoardWithTasks extends TaskBoard {
  tasks: (Task & { assignee?: Profile | null })[]
}

interface KanbanBoardProps {
  projectId: string
  boards: BoardWithTasks[]
  members?: Profile[]
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export function KanbanBoard({ projectId, boards, members = [] }: KanbanBoardProps) {
  const router = useRouter()
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  const handleAddTask = (boardId: string) => {
    setSelectedBoardId(boardId)
    setEditingTask(null)
    setShowTaskDialog(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setSelectedBoardId(task.board_id)
    setShowTaskDialog(true)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, boardId: string) => {
    e.preventDefault()
    if (draggedTask) {
      await moveTask(draggedTask, boardId)
      router.refresh()
    }
    setDraggedTask(null)
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
      {boards.map((board) => (
        <div
          key={board.id}
          className="flex w-80 flex-shrink-0 flex-col rounded-lg bg-muted/50"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, board.id)}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{board.name}</h3>
              <Badge variant="secondary" className="rounded-full">
                {board.tasks?.length || 0}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddTask(board.id)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
            {board.tasks?.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => handleEditTask(task)}
              >
                <CardContent className="p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground" />
                    <p className="flex-1 text-sm font-medium">{task.title}</p>
                  </div>

                  {task.description && (
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {task.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.full_name?.[0] || task.assignee.email[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <TaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        boardId={selectedBoardId}
        task={editingTask}
        members={members}
      />
    </div>
  )
}
