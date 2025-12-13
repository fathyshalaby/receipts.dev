"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import type { Workspace, Profile } from "@/lib/types/database"

interface WorkspaceWithRole extends Workspace {
  role: string
}

interface WorkspaceContextType {
  workspaces: WorkspaceWithRole[]
  activeWorkspace: WorkspaceWithRole | null
  setActiveWorkspace: (workspace: WorkspaceWithRole) => void
  profile: Profile | null
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({
  children,
  workspaces,
  initialWorkspace,
  profile,
}: {
  children: React.ReactNode
  workspaces: WorkspaceWithRole[]
  initialWorkspace: WorkspaceWithRole | null
  profile: Profile | null
}) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceWithRole | null>(initialWorkspace)

  const setActiveWorkspace = useCallback((workspace: WorkspaceWithRole) => {
    setActiveWorkspaceState(workspace)
    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("activeWorkspaceId", workspace.id)
    }
  }, [])

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, profile }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
