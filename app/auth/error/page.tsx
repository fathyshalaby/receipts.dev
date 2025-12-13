import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Sparkles } from "lucide-react"

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-semibold">AgencyOS</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
            <CardDescription>We couldn&apos;t complete your request</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {params?.error && (
              <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Error: {params.error}</p>
            )}
            <Link href="/auth/login">
              <Button>Back to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
