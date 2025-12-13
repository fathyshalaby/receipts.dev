"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { InvoiceStatus } from "@/lib/types/database"

interface InvoiceItemData {
  description: string
  quantity: number
  unit_price: number
}

interface InvoiceFormData {
  client_id: string
  project_id?: string
  issue_date: string
  due_date: string
  tax_rate: number
  notes?: string
  items: InvoiceItemData[]
}

function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `INV-${year}${month}-${random}`
}

export async function createInvoice(workspaceId: string, data: InvoiceFormData) {
  const supabase = await createSupabaseClient()

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxAmount = subtotal * (data.tax_rate / 100)
  const total = subtotal + taxAmount

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      workspace_id: workspaceId,
      client_id: data.client_id,
      project_id: data.project_id || null,
      invoice_number: generateInvoiceNumber(),
      status: "draft" as InvoiceStatus,
      issue_date: data.issue_date,
      due_date: data.due_date,
      subtotal,
      tax_rate: data.tax_rate,
      tax_amount: taxAmount,
      total,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // Create invoice items
  if (data.items.length > 0) {
    const items = data.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(items)
    if (itemsError) throw itemsError
  }

  revalidatePath("/dashboard/invoices")
  return invoice
}

export async function updateInvoice(
  invoiceId: string,
  data: Partial<InvoiceFormData> & { status?: InvoiceStatus }
) {
  const supabase = await createSupabaseClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.client_id) updateData.client_id = data.client_id
  if (data.project_id !== undefined) updateData.project_id = data.project_id || null
  if (data.issue_date) updateData.issue_date = data.issue_date
  if (data.due_date) updateData.due_date = data.due_date
  if (data.tax_rate !== undefined) updateData.tax_rate = data.tax_rate
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.status) {
    updateData.status = data.status
    if (data.status === "paid") {
      updateData.paid_at = new Date().toISOString()
    }
  }

  // Recalculate totals if items provided
  if (data.items) {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const taxRate = data.tax_rate ?? 0
    const taxAmount = subtotal * (taxRate / 100)
    updateData.subtotal = subtotal
    updateData.tax_amount = taxAmount
    updateData.total = subtotal + taxAmount

    // Delete existing items and insert new ones
    await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId)

    const items = data.items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(items)
    if (itemsError) throw itemsError
  }

  const { error } = await supabase.from("invoices").update(updateData).eq("id", invoiceId)

  if (error) throw error
  revalidatePath("/dashboard/invoices")
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const supabase = await createSupabaseClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === "paid") {
    updateData.paid_at = new Date().toISOString()
  }

  const { error } = await supabase.from("invoices").update(updateData).eq("id", invoiceId)

  if (error) throw error
  revalidatePath("/dashboard/invoices")
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createSupabaseClient()

  // Delete items first (foreign key constraint)
  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId)

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId)

  if (error) throw error
  revalidatePath("/dashboard/invoices")
}

export async function sendInvoice(invoiceId: string) {
  // Update status to sent
  await updateInvoiceStatus(invoiceId, "sent")
  // In a real app, you'd send an email here
  return { success: true }
}
