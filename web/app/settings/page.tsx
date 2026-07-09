import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Settings — Receipts",
  description: "Manage your API keys and account settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="container">
        <div className="page-head">
          <div>
            <h1>Settings</h1>
            <p className="muted">Manage your account and API keys for receipt publishing</p>
          </div>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h2>API Keys</h2>
            <p className="muted">
              Create API keys to use with the Receipts CLI. Each key allows you to publish receipts from your CI/CD
              pipeline.
            </p>
            <ApiKeyManager />
          </section>

          <section className="settings-section">
            <h2>Account</h2>
            <div className="info-box">
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p className="muted text-sm" style={{ marginTop: "8px" }}>
                Use your email to sign in. Your data is protected by Supabase Row-Level Security.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
