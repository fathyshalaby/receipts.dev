"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ClientStatus } from "@/lib/types/database"

interface ClientFormData {
  name: string
  email: string
  phone: string
  company: string
  status: ClientStatus
  website: string
  address: string
  notes: string
}

export async function createClient(workspaceId: string, data: ClientFormData) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.from("clients").insert({
    workspace_id: workspaceId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
    status: data.status,
    website: data.website || null,
    address: data.address || null,
    notes: data.notes || null,
  })

  if (error) throw error
  revalidatePath("/dashboard/clients")
}

export async function updateClient(clientId: string, data: Partial<ClientFormData>) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from("clients")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)

  if (error) throw error
  revalidatePath("/dashboard/clients")
}

export async function deleteClient(clientId: string) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.from("clients").delete().eq("id", clientId)

  if (error) throw error
  revalidatePath("/dashboard/clients")
}

export async function addClientNote(clientId: string, userId: string, content: string) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    user_id: userId,
    content,
  })

  if (error) throw error
  revalidatePath(`/dashboard/clients/${clientId}`)
}
