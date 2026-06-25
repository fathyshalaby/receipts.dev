import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container">
      <div className="empty" style={{ marginTop: 60 }}>
        <h2>Receipt not found</h2>
        <p>
          It doesn&apos;t exist, or you don&apos;t have access to it.{" "}
          <Link href="/gallery" style={{ color: "var(--violet-light)" }}>
            Back to all receipts
          </Link>
        </p>
      </div>
    </main>
  );
}
