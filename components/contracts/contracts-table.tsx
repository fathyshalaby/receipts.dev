"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Contract, ContractStatus } from "@/lib/types/database"
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
import { MoreHorizontal, Search, Pencil, Trash2, FileSignature, CheckCircle } from "lucide-react"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { deleteContract, signContract } from "@/lib/actions/contracts"
import { format } from "date-fns"

interface Client {
    id: string
    name: string
    company: string | null
}

interface ContractsTableProps {
    contracts: Contract[]
    workspaceId: string
    clients: Client[]
}

const statusColors: Record<ContractStatus, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    signed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    cancelled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
}

export function ContractsTable({ contracts, workspaceId, clients }: ContractsTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [editingContract, setEditingContract] = useState<Contract | null>(null)

    const filteredContracts = contracts.filter(
        (contract) =>
            contract.title.toLowerCase().includes(search.toLowerCase()) ||
            contract.client?.name.toLowerCase().includes(search.toLowerCase()) ||
            contract.client?.company?.toLowerCase().includes(search.toLowerCase()),
    )

    const handleDelete = async (contractId: string) => {
        if (confirm("Are you sure you want to delete this contract?")) {
            await deleteContract(contractId)
            router.refresh()
        }
    }

    const handleSign = async (contractId: string) => {
        if (confirm("Mark this contract as signed?")) {
            await signContract(contractId)
            router.refresh()
        }
    }

    const formatCurrency = (amount: number | null) => {
        if (!amount) return "-"
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search contracts..."
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
                            <TableHead>Title</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No contracts found. Create your first contract to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredContracts.map((contract) => (
                                <TableRow key={contract.id}>
                                    <TableCell className="font-medium">{contract.title}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{contract.client?.name || "Unknown"}</p>
                                            <p className="text-sm text-muted-foreground">{contract.client?.company || ""}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(contract.value)}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {contract.start_date ? format(new Date(contract.start_date), "MMM d, yyyy") : "-"}
                                            {" → "}
                                            {contract.end_date ? format(new Date(contract.end_date), "MMM d, yyyy") : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={statusColors[contract.status]}>
                                            {contract.status}
                                        </Badge>
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
                                                <DropdownMenuItem onClick={() => setEditingContract(contract)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {contract.status !== "signed" && (
                                                    <DropdownMenuItem onClick={() => handleSign(contract.id)}>
                                                        <FileSignature className="mr-2 h-4 w-4" />
                                                        Mark Signed
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-destructive">
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

            <ContractDialog
                open={!!editingContract}
                onOpenChange={(open) => !open && setEditingContract(null)}
                workspaceId={workspaceId}
                clients={clients}
                contract={editingContract}
            />
        </div>
    )
}
