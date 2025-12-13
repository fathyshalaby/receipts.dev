"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Invoice, InvoiceStatus } from "@/lib/types/database"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Search, Pencil, Trash2, Send, CheckCircle, Eye, Clock } from "lucide-react"
import { InvoiceDialog } from "@/components/invoices/invoice-dialog"
import { deleteInvoice, updateInvoiceStatus, sendInvoice } from "@/lib/actions/invoices"
import { format } from "date-fns"

interface Client {
    id: string
    name: string
    email: string | null
    company: string | null
}

interface Project {
    id: string
    name: string
    client_id: string | null
}

interface InvoiceWithClient extends Omit<Invoice, 'client'> {
    client: Client | null
}

interface InvoicesTableProps {
    invoices: InvoiceWithClient[]
    workspaceId: string
    clients: Client[]
    projects: Project[]
}

const statusColors: Record<InvoiceStatus, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    cancelled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
}

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
    draft: <Pencil className="h-3 w-3 mr-1" />,
    sent: <Send className="h-3 w-3 mr-1" />,
    paid: <CheckCircle className="h-3 w-3 mr-1" />,
    overdue: <Clock className="h-3 w-3 mr-1" />,
    cancelled: <Trash2 className="h-3 w-3 mr-1" />,
}

export function InvoicesTable({ invoices, workspaceId, clients, projects }: InvoicesTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [editingInvoice, setEditingInvoice] = useState<InvoiceWithClient | null>(null)

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch =
            invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            invoice.client?.name.toLowerCase().includes(search.toLowerCase()) ||
            invoice.client?.company?.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const handleDelete = async (invoiceId: string) => {
        if (confirm("Are you sure you want to delete this invoice?")) {
            await deleteInvoice(invoiceId)
            router.refresh()
        }
    }

    const handleSend = async (invoiceId: string) => {
        await sendInvoice(invoiceId)
        router.refresh()
    }

    const handleMarkPaid = async (invoiceId: string) => {
        await updateInvoiceStatus(invoiceId, "paid")
        router.refresh()
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    }

    const totalStats = {
        total: invoices.length,
        draft: invoices.filter((i) => i.status === "draft").length,
        sent: invoices.filter((i) => i.status === "sent").length,
        paid: invoices.filter((i) => i.status === "paid").length,
        totalValue: invoices.reduce((sum, i) => sum + Number(i.total), 0),
        paidValue: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0),
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{totalStats.total}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Draft</p>
                    <p className="text-2xl font-bold">{totalStats.draft}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalStats.totalValue)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.paidValue)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No invoices found. Create your first invoice to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{invoice.client?.name || "Unknown"}</p>
                                            <p className="text-sm text-muted-foreground">{invoice.client?.company || ""}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{format(new Date(invoice.issue_date), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{format(new Date(invoice.due_date), "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`${statusColors[invoice.status]} flex w-fit items-center`}>
                                            {statusIcons[invoice.status]}
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(Number(invoice.total))}
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
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {invoice.status === "draft" && (
                                                    <DropdownMenuItem onClick={() => handleSend(invoice.id)}>
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Send Invoice
                                                    </DropdownMenuItem>
                                                )}
                                                {invoice.status === "sent" && (
                                                    <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Mark as Paid
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive">
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

            <InvoiceDialog
                open={!!editingInvoice}
                onOpenChange={(open) => !open && setEditingInvoice(null)}
                workspaceId={workspaceId}
                clients={clients}
                projects={projects}
                invoice={editingInvoice as unknown as Invoice}
            />
        </div>
    )
}
