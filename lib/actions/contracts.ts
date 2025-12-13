"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ContractStatus } from "@/lib/types/database"

interface ContractFormData {
    client_id: string
    title: string
    content: string
    status: ContractStatus
    value?: number
    start_date?: string
    end_date?: string
}

export async function createContract(workspaceId: string, data: ContractFormData) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase.from("contracts").insert({
        workspace_id: workspaceId,
        client_id: data.client_id,
        title: data.title,
        content: data.content,
        status: data.status,
        value: data.value || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
    })

    if (error) throw error
    revalidatePath("/dashboard/contracts")
}

export async function updateContract(contractId: string, data: Partial<ContractFormData>) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("contracts")
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", contractId)

    if (error) throw error
    revalidatePath("/dashboard/contracts")
}

export async function deleteContract(contractId: string) {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from("contracts").delete().eq("id", contractId)
    if (error) throw error
    revalidatePath("/dashboard/contracts")
}

export async function signContract(contractId: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("contracts")
        .update({
            status: "signed",
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", contractId)

    if (error) throw error
    revalidatePath("/dashboard/contracts")
}
