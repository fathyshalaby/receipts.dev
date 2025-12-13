"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProjectDialog } from "@/components/projects/project-dialog"

interface ProjectsHeaderProps {
  workspaceId: string
  clients: { id: string; name: string }[]
}

export function ProjectsHeader({ workspaceId, clients }: ProjectsHeaderProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">Manage your projects and track progress</p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
      <ProjectDialog open={showDialog} onOpenChange={setShowDialog} workspaceId={workspaceId} clients={clients} />
    </div>
  )
}
