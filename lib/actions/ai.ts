"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ChatMessage {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

export async function sendMessage(workspaceId: string, content: string) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    // 1. Save user message
    const { error: userError } = await supabase.from("chat_messages").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "user",
        content,
    })

    if (userError) throw userError

    // 2. Simulate AI response (Mock)
    // In a real app, you would call OpenAI/Anthropic API here
    const aiResponse = generateMockResponse(content)

    // 3. Save AI message
    const { error: aiError } = await supabase.from("chat_messages").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "assistant",
        content: aiResponse,
    })

    if (aiError) throw aiError

    revalidatePath("/dashboard/ai")
}

export async function clearChat(workspaceId: string) {
    const supabase = await createSupabaseClient()

    const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("workspace_id", workspaceId)

    if (error) throw error
    revalidatePath("/dashboard/ai")
}

function generateMockResponse(input: string): string {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("blog") || lowerInput.includes("post")) {
        return "Here's a draft for your blog post:\n\n**Title: The Future of Digital Marketing**\n\nIn today's rapidly evolving landscape, digital marketing is more than just ads—it's about connection. As we move into 2025, personalization and AI-driven strategies are taking center stage..."
    }

    if (lowerInput.includes("email") || lowerInput.includes("newsletter")) {
        return "Subject: Exclusive Offer Inside! 🚀\n\nHi [Name],\n\nWe noticed you haven't checked out our latest features yet. We'd love to show you what you've been missing..."
    }

    if (lowerInput.includes("contract") || lowerInput.includes("agreement")) {
        return "I can help you draft a contract clause. Here's a standard confidentiality clause:\n\n'The Recipient agrees to keep all Proprietary Information confidential and shall not disclose it to any third party without the prior written consent of the Disclosing Party.'"
    }

    return "I'm your AgencyOS AI Assistant. I can help you generate content for blog posts, emails, social media, and contracts. Just ask!"
}
