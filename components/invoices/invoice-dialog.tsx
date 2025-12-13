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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { createInvoice, updateInvoice } from "@/lib/actions/invoices"
import type { Invoice } from "@/lib/types/database"

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

interface InvoiceItem {
    description: string
    quantity: number
    unit_price: number
}

interface InvoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId: string
    clients: Client[]
    projects: Project[]
    invoice?: Invoice | null
}

export function InvoiceDialog({
    open,
    onOpenChange,
    workspaceId,
    clients,
    projects,
    invoice,
}: InvoiceDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [clientId, setClientId] = useState("")
    const [projectId, setProjectId] = useState("")
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
    const [dueDate, setDueDate] = useState(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    )
    const [taxRate, setTaxRate] = useState(0)
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "", quantity: 1, unit_price: 0 },
    ])

    // Filter projects based on selected client
    const filteredProjects = projects.filter(
        (p) => !clientId || p.client_id === clientId
    )

    useEffect(() => {
        if (invoice) {
            setClientId(invoice.client_id)
            setProjectId(invoice.project_id || "")
            setIssueDate(invoice.issue_date)
            setDueDate(invoice.due_date)
            setTaxRate(invoice.tax_rate)
            setNotes(invoice.notes || "")
            // Would need to fetch items separately in a real app
            setItems([{ description: "", quantity: 1, unit_price: 0 }])
        } else {
            resetForm()
        }
    }, [invoice, open])

    const resetForm = () => {
        setClientId("")
        setProjectId("")
        setIssueDate(new Date().toISOString().split("T")[0])
        setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        setTaxRate(0)
        setNotes("")
        setItems([{ description: "", quantity: 1, unit_price: 0 }])
    }

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, unit_price: 0 }])
    }

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const validItems = items.filter((item) => item.description.trim() !== "")

            if (invoice) {
                await updateInvoice(invoice.id, {
                    client_id: clientId,
                    project_id: projectId || undefined,
                    issue_date: issueDate,
                    due_date: dueDate,
                    tax_rate: taxRate,
                    notes,
                    items: validItems,
                })
            } else {
                await createInvoice(workspaceId, {
                    client_id: clientId,
                    project_id: projectId || undefined,
                    issue_date: issueDate,
                    due_date: dueDate,
                    tax_rate: taxRate,
                    notes,
                    items: validItems,
                })
            }
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error("Failed to save invoice:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{invoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
                    <DialogDescription>
                        {invoice ? "Update invoice details" : "Create a new invoice for your client"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client & Project */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client">Client *</Label>
                            <Select value={clientId} onValueChange={setClientId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name} {client.company && `(${client.company})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project">Project (Optional)</Label>
                            <Select value={projectId} onValueChange={setProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">No project</SelectItem>
                                    {filteredProjects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="issueDate">Issue Date *</Label>
                            <Input
                                id="issueDate"
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date *</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            placeholder="Description"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-20 space-y-2">
                                        <Input
                                            type="number"
                                            placeholder="Qty"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="w-28 space-y-2">
                                        <Input
                                            type="number"
                                            placeholder="Price"
                                            min={0}
                                            step={0.01}
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="w-24 pt-2 text-right font-medium">
                                        {formatCurrency(item.quantity * item.unit_price)}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        className="mt-1"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">Tax Rate</span>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-16 h-8 text-right"
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax Amount</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-base font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional notes or terms..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !clientId}>
                            {isLoading ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
