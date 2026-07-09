# Publishing Receipts — Complete Guide

This guide explains how to set up the Receipts CLI and publish receipts from your CI/CD pipeline to your Receipts dashboard.

## Quick Start

### 1. Create an API Token

1. Sign in to your Receipts dashboard
2. Go to **Settings** (top right) > **API Keys**
3. Click **Create Key**
4. Give it a label (e.g., "CI/CD", "GitHub Actions")
5. **Copy the token immediately** — it won't be shown again!

### 2. Store Token Securely

For **GitHub Actions**:
```bash
# Go to repo Settings > Secrets and Variables > Actions
# New Repository Secret: RECEIPTS_API_TOKEN
# Paste your token
```

For **Local development**:
```bash
export RECEIPTS_API_TOKEN="sk_live_xxxx..."
```

### 3. Publish a Receipt

```bash
npm install -g receipts

# Publish from a directory with receipt files
receipts publish \
  --token=$RECEIPTS_API_TOKEN \
  --repo="owner/repo" \
  --pr-number=123 \
  --branch="main" \
  --commit="abc123..." \
  .receipts
```

## CLI Usage

### Basic Syntax

```bash
receipts publish [OPTIONS] <receipt-directory>
```

### Options

| Option | Required | Example | Description |
|--------|----------|---------|-------------|
| `--token` | Yes | `sk_live_xxx` | API token from dashboard |
| `--repo` | No | `owner/repo` | Repository name (inferred from git) |
| `--pr-number` | No | `42` | PR number for cross-linking |
| `--branch` | No | `feat/new` | Git branch name |
| `--commit` | No | `abc123` | Git commit hash |
| `--task` | No | `"E2E Tests"` | Task or test name |
| `--verdict` | No | `pass` | pass / fail / visual-only / reasoning-only |

### Examples

**Simple publish from current directory:**
```bash
receipts publish --token=sk_live_xxx .
```

**Full details for GitHub Actions:**
```bash
receipts publish \
  --token=$RECEIPTS_API_TOKEN \
  --repo="${{ github.repository }}" \
  --pr-number="${{ github.event.pull_request.number }}" \
  --branch="${{ github.head_ref }}" \
  --commit="${{ github.event.pull_request.head.sha }}" \
  .receipts/latest
```

**Local development:**
```bash
receipts publish \
  --token=sk_live_xxx \
  --repo=fathyshalaby/my-app \
  --branch=feature/new \
  --task="Local E2E run" \
  ./test-results
```

## Receipt Directory Structure

Your receipt directory should contain:

```
.receipts/
├── index.html          # Main report (rendered in dashboard)
├── manifest.json       # Metadata (required)
├── session.webm        # Optional video recording
└── screenshots/        # Optional media files
    ├── screenshot1.png
    └── screenshot2.png
```

### manifest.json Format

```json
{
  "version": "1.0",
  "agent": "playwright",
  "input": {
    "url": "https://example.com",
    "action": "Sign up flow test"
  },
  "output": {
    "verdict": "pass",
    "summary": {
      "pass": 5,
      "fail": 0,
      "inconclusive": 0,
      "not_tested": 0
    }
  },
  "timestamp": "2024-01-15T14:30:00Z",
  "duration_ms": 45000
}
```

## GitHub Actions Integration

See `.github/workflows/publish-receipts.yml` for a complete example workflow.

### Setup Steps

1. **Create the workflow file** (already provided):
   ```bash
   # .github/workflows/publish-receipts.yml exists
   # Copy the example and customize for your needs
   ```

2. **Add the API token secret**:
   - Go to repo Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `RECEIPTS_API_TOKEN`
   - Value: Your token from Settings > API Keys

3. **Customize the workflow**:
   ```yaml
   - name: Publish receipt
     run: |
       receipts publish \
         --token=${{ secrets.RECEIPTS_API_TOKEN }} \
         --repo="${{ github.repository }}" \
         --pr-number="${{ github.event.pull_request.number }}" \
         .receipts
   ```

4. **Trigger on success**:
   - Publish only when tests pass: `if: success()`
   - Publish only on PRs to main: `if: github.base_ref == 'main'`
   - Publish always: Remove the `if` condition

## Dashboard Features

Once published, receipts appear in your dashboard at **Gallery** with:

- **Metadata**: Repo, PR, branch, commit, task name
- **Verdict badge**: Pass/Fail/Visual-only/Reasoning-only
- **Visibility controls**: Private/Link-only/Public
- **Timestamps**: Created date and last viewed
- **Direct links**: To the HTML report and video files

### Filtering

In the Gallery, filter receipts by:
- **Repository**: Select from repos you have receipts from
- **Verdict**: Pass/Fail/Visual-only/Reasoning-only
- **Visibility**: Private/Link-only/Public

## Security

- **Tokens are never shown twice**: Store safely immediately after creation
- **Tokens are hashed**: Only SHA256 hash is stored in database
- **RLS protection**: Only you can see your receipts
- **Revocation**: Revoke tokens in Settings > API Keys anytime

## Troubleshooting

### "Invalid or revoked token"
- Check token in Settings > API Keys is Active (not Revoked)
- Copy the token immediately when created — it won't display again

### "Missing required field: repo"
- Either pass `--repo=owner/repo` or run from a git repo (auto-detected)

### "Receipt directory not found"
- Make sure the directory path exists
- Use absolute paths or paths relative to where you run the command

### Files not uploading
- Check file permissions (readable)
- Check total size under 100MB per file
- Supported types: HTML, JSON, WebM video, PNG, JPEG, ZIP

## Advanced: Token Rotation

Rotate your tokens regularly for security:

1. Create a new token in Settings > API Keys
2. Update GitHub Actions secret with new token
3. Test with new token in a PR
4. Revoke old token in Settings > API Keys

## API Reference

The ingest endpoint is at: `https://api.receipts.dev/ingest` (via Supabase Edge Function)

Request format:
```bash
curl -X POST https://api.receipts.dev/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @manifest.json
```

Response (on success):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "reportUrl": "https://receipts.dev/r/550e8400-e29b-41d4-a716-446655440000",
  "videoUrl": "https://storage.receipts.dev/...",
  "uploads": [
    {
      "path": "index.html",
      "uploadUrl": "https://storage.signed-url.com/..."
    }
  ]
}
```

Files are then uploaded to storage via signed URLs (no auth needed).

## Next Steps

- [x] Create API token in Settings
- [x] Store token in GitHub Actions secrets
- [x] Add publish step to your CI workflow
- [x] Push a PR to test
- [x] View receipt in dashboard
- [x] Share receipt link with team

Happy publishing!
