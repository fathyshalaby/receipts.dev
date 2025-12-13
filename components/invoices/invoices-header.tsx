"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { InvoiceDialog } from "@/components/invoices/invoice-dialog"

interface Client {
    id: string
    name: string
    email: string | null
    company: string | null
}

interface Project {
    id: string
    name: string
    client_id: string | null
}

interface InvoicesHeaderProps {
    workspaceId: string
    clients: Client[]
    projects: Project[]
}

export function InvoicesHeader({ workspaceId, clients, projects }: InvoicesHeaderProps) {
    const [showDialog, setShowDialog] = useState(false)

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                <p className="text-muted-foreground">Create and manage invoices for your clients</p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
            </Button>
            <InvoiceDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                workspaceId={workspaceId}
                clients={clients}
                projects={projects}
            />
        </div>
    )
}
