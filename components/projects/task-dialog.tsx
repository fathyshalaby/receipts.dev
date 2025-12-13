"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Task, TaskPriority, Profile } from "@/lib/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTask, updateTask, deleteTask } from "@/lib/actions/projects"
import { Trash2 } from "lucide-react"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string | null
  task?: Task | null
  members: Profile[]
}

export function TaskDialog({ open, onOpenChange, boardId, task, members }: TaskDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assigned_to: "",
    due_date: "",
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || "",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        assigned_to: "",
        due_date: "",
      })
    }
  }, [task, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!boardId) return

    setIsLoading(true)
    try {
      const data = {
        ...formData,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
      }

      if (task) {
        await updateTask(task.id, data)
      } else {
        await createTask(boardId, data)
      }
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return

    setIsLoading(true)
    try {
      await deleteTask(task.id)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the task details below." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assignee</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {task && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
