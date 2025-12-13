"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ContractDialog } from "@/components/contracts/contract-dialog"

interface Client {
    id: string
    name: string
    company: string | null
}

interface ContractsHeaderProps {
    workspaceId: string
    clients: Client[]
}

export function ContractsHeader({ workspaceId, clients }: ContractsHeaderProps) {
    const [showDialog, setShowDialog] = useState(false)

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
                <p className="text-muted-foreground">Manage client contracts and agreements</p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
            </Button>
            <ContractDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                workspaceId={workspaceId}
                clients={clients}
            />
        </div>
    )
}
