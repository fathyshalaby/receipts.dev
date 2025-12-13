"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Sparkles, Building2, ArrowRight } from "lucide-react"
import { createWorkspace } from "@/lib/actions/workspace"

interface OnboardingFormProps {
  userId: string
  userEmail: string
}

export function OnboardingForm({ userId, userEmail }: OnboardingFormProps) {
  const [workspaceName, setWorkspaceName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await createWorkspace(workspaceName, userId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-semibold">AgencyOS</span>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create your workspace</CardTitle>
          <CardDescription>Set up your agency workspace to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  type="text"
                  placeholder="My Agency"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">This is your agency or company name</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={isLoading || !workspaceName.trim()}>
                {isLoading ? "Creating..." : "Create Workspace"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
