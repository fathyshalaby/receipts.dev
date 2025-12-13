"use client"

import { SocialPost } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Twitter, Facebook, Linkedin, Instagram, Trash2, Send } from "lucide-react"
import { deletePost, publishPost } from "@/lib/actions/social"
import { useRouter } from "next/navigation"

interface SocialFeedProps {
    posts: SocialPost[]
}

const platformIcons = {
    twitter: <Twitter className="h-4 w-4" />,
    facebook: <Facebook className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
    instagram: <Instagram className="h-4 w-4" />,
}

const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    scheduled: "bg-blue-100 text-blue-800",
    published: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
}

export function SocialFeed({ posts }: SocialFeedProps) {
    const router = useRouter()

    const handleDelete = async (id: string) => {
        if (confirm("Delete this post?")) {
            await deletePost(id)
            router.refresh()
        }
    }

    const handlePublish = async (id: string) => {
        await publishPost(id)
        router.refresh()
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
                <h3 className="text-lg font-medium">No posts scheduled</h3>
                <p className="text-muted-foreground">Create your first post to get started.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
                <Card key={post.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            {platformIcons[post.platform]}
                            <span className="font-medium capitalize">{post.platform}</span>
                        </div>
                        <Badge variant="secondary" className={statusColors[post.status]}>
                            {post.status}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mt-2 min-h-[80px]">{post.content}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {post.status === "published" ? "Published" : "Scheduled"}:{" "}
                                {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
                            </span>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            {post.status === "scheduled" && (
                                <Button variant="outline" size="sm" onClick={() => handlePublish(post.id)}>
                                    <Send className="h-4 w-4 mr-1" />
                                    Publish Now
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
