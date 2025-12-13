"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LinkDialog } from "@/components/links/link-dialog"

interface LinksHeaderProps {
    workspaceId: string
}

export function LinksHeader({ workspaceId }: LinksHeaderProps) {
    const [showDialog, setShowDialog] = useState(false)

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Short Links</h1>
                <p className="text-muted-foreground">Create, track, and manage your short links</p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Link
            </Button>
            <LinkDialog open={showDialog} onOpenChange={setShowDialog} workspaceId={workspaceId} />
        </div>
    )
}
