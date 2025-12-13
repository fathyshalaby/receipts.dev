import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FolderKanban, FileText, Link2, TrendingUp, DollarSign } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get workspace membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user!.id)
    .limit(1)
    .single()

  const workspaceId = membership?.workspace_id

  // Fetch dashboard stats
  const [clientsResult, projectsResult, invoicesResult, linksResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("invoices").select("id, total, status").eq("workspace_id", workspaceId),
    supabase.from("short_links").select("id, clicks", { count: "exact" }).eq("workspace_id", workspaceId),
  ])

  const clientCount = clientsResult.count || 0
  const projectCount = projectsResult.count || 0
  const invoices = invoicesResult.data || []
  const links = linksResult.data || []

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0)
  const pendingInvoices = invoices.filter((i) => i.status === "sent").length
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)

  const stats = [
    { name: "Total Clients", value: clientCount, icon: Users, change: "+2 this month" },
    { name: "Active Projects", value: projectCount, icon: FolderKanban, change: "3 in progress" },
    { name: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, change: "From paid invoices" },
    { name: "Pending Invoices", value: pendingInvoices, icon: FileText, change: "Awaiting payment" },
    { name: "Short Links", value: links.length, icon: Link2, change: `${totalClicks} total clicks` },
    { name: "Link Clicks", value: totalClicks, icon: TrendingUp, change: "All time" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your agency.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity yet. Start by adding your first client!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a href="/dashboard/clients" className="text-sm text-primary hover:underline">
              Add a new client
            </a>
            <a href="/dashboard/projects" className="text-sm text-primary hover:underline">
              Create a project
            </a>
            <a href="/dashboard/invoices" className="text-sm text-primary hover:underline">
              Create an invoice
            </a>
            <a href="/dashboard/links" className="text-sm text-primary hover:underline">
              Shorten a link
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
