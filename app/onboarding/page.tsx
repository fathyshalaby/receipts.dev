import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user already has a workspace
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id)

  if (memberships && memberships.length > 0) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-6">
      <OnboardingForm userId={user.id} userEmail={user.email || ""} />
    </div>
  )
}
