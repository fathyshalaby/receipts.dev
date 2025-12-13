"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Trash2, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { addKeyword, deleteKeyword, runAudit } from "@/lib/actions/seo"
import type { SeoKeyword, SeoAudit } from "@/lib/types/database"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"

interface SeoDashboardProps {
    workspaceId: string
    keywords: SeoKeyword[]
    audits: SeoAudit[]
}

export function SeoDashboard({ workspaceId, keywords, audits }: SeoDashboardProps) {
    const [activeTab, setActiveTab] = useState("keywords")

    return (
        <Tabs defaultValue="keywords" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
                <TabsTrigger value="keywords">Keyword Tracking</TabsTrigger>
                <TabsTrigger value="audits">Site Audits</TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="space-y-4">
                <KeywordTracker workspaceId={workspaceId} keywords={keywords} />
            </TabsContent>

            <TabsContent value="audits" className="space-y-4">
                <SiteAuditor workspaceId={workspaceId} audits={audits} />
            </TabsContent>
        </Tabs>
    )
}

function KeywordTracker({ workspaceId, keywords }: { workspaceId: string; keywords: SeoKeyword[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newKeyword, setNewKeyword] = useState("")
    const [newUrl, setNewUrl] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleAddKeyword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await addKeyword(workspaceId, newKeyword, newUrl)
            setIsDialogOpen(false)
            setNewKeyword("")
            setNewUrl("")
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Tracked Keywords</CardTitle>
                    <CardDescription>Monitor your search engine rankings</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Keyword
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Track New Keyword</DialogTitle>
                            <DialogDescription>Enter a keyword and URL to track its position.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddKeyword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="keyword">Keyword</Label>
                                <Input
                                    id="keyword"
                                    placeholder="e.g. marketing agency"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">URL</Label>
                                <Input
                                    id="url"
                                    placeholder="https://example.com"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Adding..." : "Add Keyword"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {keywords.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No keywords tracked yet. Add one to get started.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keywords.map((k) => (
                                <div key={k.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-1">
                                        <div className="font-medium">{k.keyword}</div>
                                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">{k.url}</div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-xs text-muted-foreground">Position</div>
                                            <div className="font-bold text-lg">{k.position || "-"}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-muted-foreground">Change</div>
                                            <div className={`flex items-center justify-center font-medium ${k.change > 0 ? "text-green-600" : k.change < 0 ? "text-red-600" : "text-muted-foreground"
                                                }`}>
                                                {k.change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> :
                                                    k.change < 0 ? <ArrowDown className="h-3 w-3 mr-1" /> :
                                                        <Minus className="h-3 w-3 mr-1" />}
                                                {Math.abs(k.change)}
                                            </div>
                                        </div>
                                        <div className="text-center hidden md:block">
                                            <div className="text-xs text-muted-foreground">Volume</div>
                                            <div className="font-medium">{k.volume?.toLocaleString() || "-"}</div>
                                        </div>
                                        <div className="text-center hidden md:block">
                                            <div className="text-xs text-muted-foreground">Difficulty</div>
                                            <div className="font-medium">{k.difficulty || "-"}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => deleteKeyword(k.id)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function SiteAuditor({ workspaceId, audits }: { workspaceId: string; audits: SeoAudit[] }) {
    const [url, setUrl] = useState("")
    const [isRunning, setIsRunning] = useState(false)

    const handleRunAudit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsRunning(true)
        try {
            await runAudit(workspaceId, url)
            setUrl("")
        } catch (error) {
            console.error(error)
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Site Audits</CardTitle>
                    <CardDescription>Analyze your pages for SEO issues</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <form onSubmit={handleRunAudit} className="flex gap-2">
                            <Input
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                            <Button type="submit" disabled={isRunning}>
                                {isRunning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Run Audit
                            </Button>
                        </form>

                        <div className="space-y-4">
                            {audits.map((audit) => (
                                <div key={audit.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium">{audit.url}</div>
                                        <Badge variant={audit.status === "completed" ? "default" : "secondary"}>
                                            {audit.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Health Score</span>
                                                <span className="font-bold">{audit.score || 0}/100</span>
                                            </div>
                                            <Progress value={audit.score || 0} className="h-2" />
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {format(new Date(audit.created_at), "MMM d, HH:mm")}
                                        </div>
                                    </div>
                                    {audit.report && (
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-muted/50 p-2 rounded">
                                                <span className="text-muted-foreground">Issues Found:</span> {audit.issues_count}
                                            </div>
                                            <div className="bg-muted/50 p-2 rounded">
                                                <span className="text-muted-foreground">Load Time:</span> {audit.report.load_time}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {audits.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No audits run yet. Enter a URL to start.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>SEO Tips</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
                        <li>Ensure your title tags are under 60 characters.</li>
                        <li>Use descriptive meta descriptions (150-160 chars).</li>
                        <li>Use only one H1 tag per page.</li>
                        <li>Optimize images with alt text and compression.</li>
                        <li>Improve page load speed (Core Web Vitals).</li>
                        <li>Ensure mobile responsiveness.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
