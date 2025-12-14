"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/components/providers/workspace-provider"

export function VerificationBanner() {
    const { activeWorkspace } = useWorkspace()

    // If there is an active workspace, do not show the banner
    if (activeWorkspace) {
        return null
    }

    return (
        <div className="flex w-full items-center justify-between gap-4 bg-yellow-500/15 px-6 py-3 text-sm text-yellow-600 dark:text-yellow-400">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Setup Required:</span>
                <span>You haven&apos;t created a workspace yet. Create one to unlock all features.</span>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8 border-yellow-500/50 hover:bg-yellow-500/20">
                <Link href="/onboarding" className="flex items-center gap-2">
                    Complete Setup
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </Button>
        </div>
    )
}
