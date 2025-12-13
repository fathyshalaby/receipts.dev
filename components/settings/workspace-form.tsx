"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { updateWorkspace } from "@/lib/actions/settings"
import { Workspace } from "@/lib/types/database"

interface WorkspaceFormProps {
    workspace: Workspace
}

export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [name, setName] = useState(workspace.name)
    const [slug, setSlug] = useState(workspace.slug)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await updateWorkspace(workspace.id, { name, slug })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>Manage your workspace details</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ws-name">Workspace Name</Label>
                        <Input
                            id="ws-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Workspace Slug</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">agencyos.com/</span>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
