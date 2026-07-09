"use client";

import { useState, useEffect } from "react";
import { Copy, Trash2, Plus } from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface NewKeyResponse {
  key: {
    id: string;
    token: string;
    label: string;
    created_at: string;
  };
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading keys");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: newKeyLabel || "Unnamed key" }),
      });
      if (!res.ok) throw new Error("Failed to create key");

      const data: NewKeyResponse = await res.json();
      setCreatedToken(data.key.token);
      setNewKeyLabel("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Are you sure? This will revoke the key immediately.")) return;

    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error revoking key");
    }
  }

  function copyToClipboard(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="key-manager">
      {/* New Key Modal */}
      {createdToken && (
        <div className="modal-overlay" onClick={() => setCreatedToken(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>API Key Created</h3>
            <p className="muted">Copy your API key now. You won&apos;t be able to see it again.</p>

            <div className="token-display">
              <code>{createdToken}</code>
              <button
                className="btn btn--sm btn--ghost"
                onClick={() => copyToClipboard(createdToken)}
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
            </div>

            <p className="notice notice--ok">
              Use this token with: <code>receipts publish --token={createdToken.slice(0, 20)}...</code>
            </p>

            <button className="btn btn--primary" onClick={() => setCreatedToken(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create New Key Form */}
      <div className="key-form">
        <input
          type="text"
          className="input"
          placeholder="Key label (e.g., 'CI/CD', 'Local development')"
          value={newKeyLabel}
          onChange={(e) => setNewKeyLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !creating && createKey()}
        />
        <button className="btn btn--primary btn--sm" onClick={createKey} disabled={creating}>
          <Plus size={16} /> Create Key
        </button>
      </div>

      {error && <div className="notice notice--err">{error}</div>}

      {/* Keys List */}
      <div className="keys-list">
        {loading ? (
          <p className="muted">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="muted">No API keys yet. Create one to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const createdDate = new Date(key.created_at);
                const lastUsedDate = key.last_used_at ? new Date(key.last_used_at) : null;
                const isRevoked = !!key.revoked_at;

                return (
                  <tr key={key.id} className={isRevoked ? "revoked" : ""}>
                    <td>
                      <code>{key.label}</code>
                    </td>
                    <td className="muted text-sm">
                      {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString()}
                    </td>
                    <td className="muted text-sm">
                      {lastUsedDate ? `${lastUsedDate.toLocaleDateString()} ${lastUsedDate.toLocaleTimeString()}` : "Never"}
                    </td>
                    <td>
                      <span className={`badge ${isRevoked ? "badge--revoked" : "badge--active"}`}>
                        {isRevoked ? "Revoked" : "Active"}
                      </span>
                    </td>
                    <td>
                      {!isRevoked && (
                        <button
                          className="btn btn--ghost btn--xs"
                          onClick={() => revokeKey(key.id)}
                          title="Revoke this key"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
