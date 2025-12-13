"use client"

import { useState } from "react"
import Link from "next/link"
import type { Project } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Calendar, DollarSign } from "lucide-react"
import { ProjectDialog } from "@/components/projects/project-dialog"

interface ProjectWithClient extends Omit<Project, 'client'> {
  client: { id: string; name: string } | null
}

interface ProjectsGridProps {
  projects: ProjectWithClient[]
  workspaceId: string
  clients: { id: string; name: string }[]
}

const statusColors: Record<string, string> = {
  planning: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function ProjectsGrid({ projects, workspaceId, clients }: ProjectsGridProps) {
  const [search, setSearch] = useState("")
  const [editingProject, setEditingProject] = useState<ProjectWithClient | null>(null)

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No projects found. Create your first project to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant="secondary" className={statusColors[project.status]}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {project.client && <p className="text-sm text-muted-foreground">{project.client.name}</p>}
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.budget && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${Number(project.budget).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        workspaceId={workspaceId}
        clients={clients}
        project={editingProject as unknown as Project}
      />
    </div>
  )
}
