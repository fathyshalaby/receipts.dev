"use client"

import { useRouter } from "next/navigation"
import type { Project } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, DollarSign } from "lucide-react"

interface ProjectWithClient extends Project {
  client?: { id: string; name: string } | null
}

interface ProjectHeaderProps {
  project: ProjectWithClient
}

const statusColors: Record<string, string> = {
  planning: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-start gap-4">
      <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/projects")}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <Badge variant="secondary" className={statusColors[project.status]}>
            {project.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
          {project.client && <span>{project.client.name}</span>}
          {project.end_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {new Date(project.end_date).toLocaleDateString()}
            </span>
          )}
          {project.budget && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />${Number(project.budget).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
