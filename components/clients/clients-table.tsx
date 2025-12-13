"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Client } from "@/lib/types/database"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Search, Pencil, Trash2, Eye } from "lucide-react"
import { ClientDialog } from "@/components/clients/client-dialog"
import { deleteClient } from "@/lib/actions/clients"

interface ClientsTableProps {
  clients: Client[]
  workspaceId: string
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  prospect: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export function ClientsTable({ clients, workspaceId }: ClientsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email?.toLowerCase().includes(search.toLowerCase()) ||
      client.company?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDelete = async (clientId: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      await deleteClient(clientId)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No clients found. Add your first client to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>{client.company || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[client.status]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingClient(client)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive">
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

      <ClientDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        workspaceId={workspaceId}
        client={editingClient}
      />
    </div>
  )
}
