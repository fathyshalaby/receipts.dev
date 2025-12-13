"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ShortLink } from "@/lib/types/database"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Search, Pencil, Trash2, Copy, ExternalLink, BarChart2 } from "lucide-react"
import { LinkDialog } from "@/components/links/link-dialog"
import { deleteLink, updateLink } from "@/lib/actions/links"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface LinksTableProps {
    links: ShortLink[]
    workspaceId: string
}

export function LinksTable({ links, workspaceId }: LinksTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [editingLink, setEditingLink] = useState<ShortLink | null>(null)

    const filteredLinks = links.filter(
        (link) =>
            link.short_code.toLowerCase().includes(search.toLowerCase()) ||
            link.original_url.toLowerCase().includes(search.toLowerCase()) ||
            link.title?.toLowerCase().includes(search.toLowerCase()),
    )

    const handleDelete = async (linkId: string) => {
        if (confirm("Are you sure you want to delete this link?")) {
            await deleteLink(linkId)
            router.refresh()
        }
    }

    const handleToggleActive = async (linkId: string, currentState: boolean) => {
        await updateLink(linkId, { is_active: !currentState })
        router.refresh()
    }

    const copyToClipboard = (shortCode: string) => {
        const url = `${window.location.origin}/s/${shortCode}`
        navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard")
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search links..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Short Link</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLinks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No links found. Create your first short link to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLinks.map((link) => (
                                <TableRow key={link.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{link.title || link.short_code}</span>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="font-mono text-xs">/{link.short_code}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4"
                                                    onClick={() => copyToClipboard(link.short_code)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="truncate text-sm text-muted-foreground" title={link.original_url}>
                                            {link.original_url}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{link.clicks}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{format(new Date(link.created_at), "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={link.is_active}
                                            onCheckedChange={() => handleToggleActive(link.id, link.is_active)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Actions</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => window.open(`/s/${link.short_code}`, "_blank")}>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Visit Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEditingLink(link)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDelete(link.id)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <LinkDialog
                open={!!editingLink}
                onOpenChange={(open) => !open && setEditingLink(null)}
                workspaceId={workspaceId}
                link={editingLink}
            />
        </div>
    )
}
