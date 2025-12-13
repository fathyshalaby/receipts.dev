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
import { createContract, updateContract } from "@/lib/actions/contracts"
import type { Contract, ContractStatus } from "@/lib/types/database"

interface Client {
    id: string
    name: string
    company: string | null
}

interface ContractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId: string
    clients: Client[]
    contract?: Contract | null
}

export function ContractDialog({
    open,
    onOpenChange,
    workspaceId,
    clients,
    contract,
}: ContractDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [clientId, setClientId] = useState("")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [status, setStatus] = useState<ContractStatus>("draft")
    const [value, setValue] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        if (contract) {
            setClientId(contract.client_id)
            setTitle(contract.title)
            setContent(contract.content || "")
            setStatus(contract.status)
            setValue(contract.value?.toString() || "")
            setStartDate(contract.start_date || "")
            setEndDate(contract.end_date || "")
        } else {
            resetForm()
        }
    }, [contract, open])

    const resetForm = () => {
        setClientId("")
        setTitle("")
        setContent("")
        setStatus("draft")
        setValue("")
        setStartDate("")
        setEndDate("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const data = {
                client_id: clientId,
                title,
                content,
                status,
                value: value ? parseFloat(value) : undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            }

            if (contract) {
                await updateContract(contract.id, data)
            } else {
                await createContract(workspaceId, data)
            }
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error("Failed to save contract:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{contract ? "Edit Contract" : "Create Contract"}</DialogTitle>
                    <DialogDescription>
                        {contract ? "Update contract details" : "Create a new contract for your client"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="signed">Signed</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Contract Title *</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Web Development Agreement"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="value">Value ($)</Label>
                            <Input
                                id="value"
                                type="number"
                                placeholder="0.00"
                                min={0}
                                step={0.01}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Contract Content</Label>
                        <Textarea
                            id="content"
                            placeholder="Enter contract terms..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            className="font-mono text-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !clientId || !title}>
                            {isLoading ? "Saving..." : contract ? "Update Contract" : "Create Contract"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
