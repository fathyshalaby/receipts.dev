"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  ScrollText,
  Share2,
  Search,
  Link2,
  Sparkles,
  Settings,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Contracts", href: "/dashboard/contracts", icon: ScrollText },
  { name: "Social Media", href: "/dashboard/social", icon: Share2 },
  { name: "SEO Tools", href: "/dashboard/seo", icon: Search },
  { name: "Link Shortener", href: "/dashboard/links", icon: Link2 },
  { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
]

const bottomNavigation = [{ name: "Settings", href: "/dashboard/settings", icon: Settings }]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { activeWorkspace } = useWorkspace()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Workspace Switcher */}
      <div className="border-b border-border p-4">
        <WorkspaceSwitcher />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-4">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
