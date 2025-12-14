"use client"

import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyWorkspaceStateProps {
    title?: string
    description?: string
}

export function EmptyWorkspaceState({
    title = "Authentication Required",
    description = "You need to create a workspace to use this feature.",
}: EmptyWorkspaceStateProps) {
    return (
        <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center animate-in fade-in-50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mb-4 mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
            <Button asChild>
                <Link href="/onboarding">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                </Link>
            </Button>
        </div>
    )
}
