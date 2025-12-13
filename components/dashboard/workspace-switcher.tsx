"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWorkspace } from "@/components/providers/workspace-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWorkspace } from "@/lib/actions/workspace"
import { useRouter } from "next/navigation"

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, profile } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreateWorkspace = async () => {
    if (!profile || !newWorkspaceName.trim()) return

    setIsCreating(true)
    const result = await createWorkspace(newWorkspaceName, profile.id)

    if (result.success) {
      setShowNewDialog(false)
      setNewWorkspaceName("")
      router.refresh()
    }
    setIsCreating(false)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a workspace"
            className="w-full justify-between bg-transparent"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </div>
              <span className="truncate">{activeWorkspace?.name || "Select workspace"}</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Workspaces">
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => {
                      setActiveWorkspace(workspace)
                      setOpen(false)
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <span className="ml-2">{workspace.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        activeWorkspace?.id === workspace.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setShowNewDialog(true)
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workspace
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Add a new workspace to manage a different agency or team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                placeholder="My Agency"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
