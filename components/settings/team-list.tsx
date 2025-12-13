"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { inviteMember, removeMember, cancelInvite } from "@/lib/actions/settings"
import { WorkspaceMember, WorkspaceInvite } from "@/lib/types/database"
import { Trash2, UserPlus, Mail } from "lucide-react"

interface TeamListProps {
    workspaceId: string
    members: WorkspaceMember[]
    invites: WorkspaceInvite[]
    currentUserRole: string
}

export function TeamList({ workspaceId, members, invites, currentUserRole }: TeamListProps) {
    const [inviteEmail, setInviteEmail] = useState("")
    const [isInviting, setIsInviting] = useState(false)

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsInviting(true)
        try {
            await inviteMember(workspaceId, inviteEmail)
            setInviteEmail("")
        } catch (error) {
            console.error(error)
        } finally {
            setIsInviting(false)
        }
    }

    const handleRemoveMember = async (id: string) => {
        if (confirm("Remove this member?")) {
            await removeMember(id)
        }
    }

    const handleCancelInvite = async (id: string) => {
        if (confirm("Cancel this invite?")) {
            await cancelInvite(id)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.profile?.avatar_url || ""} />
                                        <AvatarFallback>{member.profile?.full_name?.[0] || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{member.profile?.full_name || "Unknown"}</div>
                                        <div className="text-sm text-muted-foreground">{member.profile?.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                                        {member.role}
                                    </Badge>
                                    {currentUserRole === "owner" && member.role !== "owner" && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invite Member</CardTitle>
                    <CardDescription>Send an invitation to join your team</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleInvite} className="flex gap-2">
                        <Input
                            placeholder="colleague@example.com"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                        />
                        <Button type="submit" disabled={isInviting}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite
                        </Button>
                    </form>

                    {invites.length > 0 && (
                        <div className="mt-6 space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Pending Invites</h4>
                            {invites.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{invite.email}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)}>
                                        Cancel
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
