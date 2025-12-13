import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ClientDetails } from "@/components/clients/client-details"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Fetch client with related data
  const { data: client, error } = await supabase.from("clients").select("*").eq("id", id).single()

  if (error || !client) notFound()

  // Fetch client notes
  const { data: notes } = await supabase
    .from("client_notes")
    .select(
      `
      *,
      user:profiles(full_name, email)
    `,
    )
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  // Fetch related projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  // Fetch related invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  return (
    <ClientDetails
      client={client}
      notes={notes || []}
      projects={projects || []}
      invoices={invoices || []}
      userId={user.id}
    />
  )
}
