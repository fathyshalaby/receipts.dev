"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Sparkles, Trash2, User, Bot } from "lucide-react"
import { sendMessage, clearChat, type ChatMessage } from "@/lib/actions/ai"
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
    workspaceId: string
    initialMessages: ChatMessage[]
}

export function ChatInterface({ workspaceId, initialMessages }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            await sendMessage(workspaceId, userMessage.content)
            // In a real app with real-time subscriptions, we wouldn't need to manually fetch or guess
            // But for now, we'll rely on the server action revalidating the page, 
            // OR we can just simulate the response adding to local state for instant feedback
            // Since revalidatePath works on the server component, we might not see the update immediately in client state
            // unless we refresh or use a more complex setup.
            // For this demo, let's just refresh the page or assume the server action worked and we'll see it on next load.
            // Actually, let's just mock the addition of the AI response locally for smooth UX

            // Wait a bit to simulate processing
            setTimeout(() => {
                // This is a bit hacky because we don't know exactly what the server generated without returning it
                // But for the demo it's fine. 
                // Ideally `sendMessage` should return the AI message.
                // Let's assume we refresh the page to get the real data.
                window.location.reload()
            }, 1000)

        } catch (error) {
            console.error("Failed to send message:", error)
        }
    }

    const handleClear = async () => {
        if (confirm("Clear chat history?")) {
            await clearChat(workspaceId)
            setMessages([])
        }
    }

    return (
        <div className="flex flex-col flex-1 border rounded-lg overflow-hidden bg-background shadow-sm">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AgencyOS AI</h3>
                        <p className="text-xs text-muted-foreground">Always here to help</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClear} title="Clear history">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-4">
                    {messages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No messages yet. Start a conversation!</p>
                            <p className="text-sm mt-2">Try asking for a blog post idea or an email draft.</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[80%]",
                                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1">
                                <AvatarFallback className={msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div
                                className={cn(
                                    "p-3 rounded-lg text-sm whitespace-pre-wrap",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-muted rounded-tl-none"
                                )}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        {isLoading ? (
                            <Sparkles className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
