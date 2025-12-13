import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatInterface } from "@/components/ai/chat-interface"

export default async function AIPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect("/auth/login")

    // Get workspace membership
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single()

    if (!membership) redirect("/onboarding")

    // Fetch chat history
    const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: true })

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
                <p className="text-muted-foreground">Generate content and get help with your agency tasks</p>
            </div>

            <ChatInterface
                workspaceId={membership.workspace_id}
                initialMessages={messages || []}
            />
        </div>
    )
}
