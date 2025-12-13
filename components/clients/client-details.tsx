"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Client, Project, Invoice } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Send, FileText, FolderKanban } from "lucide-react"
import { addClientNote } from "@/lib/actions/clients"

interface ClientNote {
  id: string
  content: string
  created_at: string
  user: { full_name: string | null; email: string } | null
}

interface ClientDetailsProps {
  client: Client
  notes: ClientNote[]
  projects: Project[]
  invoices: Invoice[]
  userId: string
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  prospect: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export function ClientDetails({ client, notes, projects, invoices, userId }: ClientDetailsProps) {
  const router = useRouter()
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setIsAddingNote(true)
    try {
      await addClientNote(client.id, userId, newNote)
      setNewNote("")
      router.refresh()
    } catch (error) {
      console.error("Error adding note:", error)
    } finally {
      setIsAddingNote(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant="secondary" className={statusColors[client.status]}>
              {client.status}
            </Badge>
          </div>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-sm hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.company}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                  {client.website}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4 space-y-4">
              {/* Add Note */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes List */}
              {notes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No notes yet. Add your first note above.
                  </CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-4">
                      <p className="text-sm">{note.content}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{note.user?.full_name || note.user?.email || "Unknown"}</span>
                        <span>·</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              {projects.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No projects for this client yet.</p>
                    <Link href="/dashboard/projects">
                      <Button className="mt-4 bg-transparent" variant="outline">
                        Create Project
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.status}</p>
                        </div>
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No invoices for this client yet.</p>
                    <Link href="/dashboard/invoices">
                      <Button className="mt-4 bg-transparent" variant="outline">
                        Create Invoice
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div>
                          <p className="font-medium">#{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">${invoice.total}</p>
                        </div>
                        <Badge variant="secondary">{invoice.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
