"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createLink, updateLink } from "@/lib/actions/links"
import type { ShortLink } from "@/lib/types/database"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface LinkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId: string
    link?: ShortLink | null
}

export function LinkDialog({ open, onOpenChange, workspaceId, link }: LinkDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [originalUrl, setOriginalUrl] = useState("")
    const [shortCode, setShortCode] = useState("")
    const [title, setTitle] = useState("")
    const [utmSource, setUtmSource] = useState("")
    const [utmMedium, setUtmMedium] = useState("")
    const [utmCampaign, setUtmCampaign] = useState("")
    const [utmTerm, setUtmTerm] = useState("")
    const [utmContent, setUtmContent] = useState("")

    useEffect(() => {
        if (link) {
            setOriginalUrl(link.original_url)
            setShortCode(link.short_code)
            setTitle(link.title || "")
            setUtmSource(link.utm_source || "")
            setUtmMedium(link.utm_medium || "")
            setUtmCampaign(link.utm_campaign || "")
            setUtmTerm(link.utm_term || "")
            setUtmContent(link.utm_content || "")
        } else {
            resetForm()
        }
    }, [link, open])

    const resetForm = () => {
        setOriginalUrl("")
        setShortCode("")
        setTitle("")
        setUtmSource("")
        setUtmMedium("")
        setUtmCampaign("")
        setUtmTerm("")
        setUtmContent("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (link) {
                await updateLink(link.id, {
                    original_url: originalUrl,
                    short_code: shortCode || undefined, // Only send if changed/set
                    title,
                    utm_source: utmSource,
                    utm_medium: utmMedium,
                    utm_campaign: utmCampaign,
                    utm_term: utmTerm,
                    utm_content: utmContent,
                })
            } else {
                await createLink(workspaceId, {
                    original_url: originalUrl,
                    short_code: shortCode || undefined,
                    title,
                    utm_source: utmSource,
                    utm_medium: utmMedium,
                    utm_campaign: utmCampaign,
                    utm_term: utmTerm,
                    utm_content: utmContent,
                })
            }
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error("Failed to save link:", error)
            alert("Failed to save link. Short code might be taken.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{link ? "Edit Link" : "Create Short Link"}</DialogTitle>
                    <DialogDescription>
                        {link ? "Update link details" : "Create a new short link with optional UTM parameters"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">Destination URL *</Label>
                        <Input
                            id="url"
                            placeholder="https://example.com/page"
                            value={originalUrl}
                            onChange={(e) => setOriginalUrl(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title (Optional)</Label>
                        <Input
                            id="title"
                            placeholder="Marketing Campaign Q1"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Short Code (Optional)</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">nuro.link/</span>
                            <Input
                                id="code"
                                placeholder="custom-code"
                                value={shortCode}
                                onChange={(e) => setShortCode(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Leave blank for auto-generated code</p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="utm">
                            <AccordionTrigger>UTM Parameters (Optional)</AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="source" className="text-xs">Source</Label>
                                        <Input
                                            id="source"
                                            placeholder="google, newsletter"
                                            size={1}
                                            value={utmSource}
                                            onChange={(e) => setUtmSource(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="medium" className="text-xs">Medium</Label>
                                        <Input
                                            id="medium"
                                            placeholder="cpc, email"
                                            size={1}
                                            value={utmMedium}
                                            onChange={(e) => setUtmMedium(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="campaign" className="text-xs">Campaign</Label>
                                    <Input
                                        id="campaign"
                                        placeholder="spring_sale"
                                        value={utmCampaign}
                                        onChange={(e) => setUtmCampaign(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="term" className="text-xs">Term</Label>
                                        <Input
                                            id="term"
                                            placeholder="running shoes"
                                            size={1}
                                            value={utmTerm}
                                            onChange={(e) => setUtmTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="content" className="text-xs">Content</Label>
                                        <Input
                                            id="content"
                                            placeholder="logolink"
                                            size={1}
                                            value={utmContent}
                                            onChange={(e) => setUtmContent(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !originalUrl}>
                            {isLoading ? "Saving..." : link ? "Update Link" : "Create Link"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
