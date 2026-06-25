import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function SiteHeader({ email }: { email?: string | null }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__dot" />
          Receipts
        </Link>
        <div className="header-user">
          {email && <span className="mono">{email}</span>}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
