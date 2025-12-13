import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Users, FileText, Link2, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">AgencyOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
            The all-in-one platform for modern agencies
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground">
            Manage clients, projects, invoices, and marketing campaigns from a single dashboard. Built for agencies that
            want to scale.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/40 bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">Everything you need to run your agency</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="CRM & Client Management"
              description="Track leads, manage relationships, and keep all client information in one place."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Project Management"
              description="Kanban boards, task assignments, and project timelines to keep teams aligned."
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Invoicing & Contracts"
              description="Create invoices, send contracts, and get paid faster with Stripe integration."
            />
            <FeatureCard
              icon={<Link2 className="h-6 w-6" />}
              title="Link Shortener"
              description="Create branded short links with UTM tracking and detailed analytics."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="SEO Tools"
              description="Track keyword rankings and monitor your SEO performance over time."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Content Generation"
              description="Generate social posts, emails, and contract clauses with AI assistance."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to streamline your agency?</h2>
          <p className="mt-4 text-muted-foreground">Join thousands of agencies already using AgencyOS.</p>
          <Link href="/auth/sign-up" className="mt-8 inline-block">
            <Button size="lg">Get Started Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AgencyOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
