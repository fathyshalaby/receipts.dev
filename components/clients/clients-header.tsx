"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ClientDialog } from "@/components/clients/client-dialog"

interface ClientsHeaderProps {
  workspaceId: string
}

export function ClientsHeader({ workspaceId }: ClientsHeaderProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">Manage your client relationships and contacts</p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Client
      </Button>
      <ClientDialog open={showDialog} onOpenChange={setShowDialog} workspaceId={workspaceId} />
    </div>
  )
}
