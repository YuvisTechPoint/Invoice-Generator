# Invoice Generation Studio

Production-ready Next.js studio for drafting, storing, sharing, and downloading client invoices (website / software development). Brand defaults: **Northline Digital**.

## Features

- Invoice library (`/invoices`) — create, open, delete, copy guest share links
- Visual editor (`/editor`) — live HTML preview, line items, presets, payment settlement
- Persistent JSON storage under `./data` (or `DATA_DIR`)
- Password-protected studio session (required in production)
- Tokenized guest HTML / PDF links (no login required for clients)
- PDF download via Puppeteer (queued, serial)
- Health check at `/api/health`

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set STUDIO_PASSWORD, SESSION_SECRET, INVOICE_ACCESS_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/invoices`.

Default local password (if you used the sample `.env.local`): `studio-dev`.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `STUDIO_PASSWORD` | Production | Studio login password |
| `SESSION_SECRET` | Production | HMAC for session cookies (≥24 chars) |
| `INVOICE_ACCESS_SECRET` | Yes | Signed guest invoice tokens |
| `GUEST_ORDER_ACCESS_SECRET` | Optional | Alias for invoice access secret |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Absolute URLs / origin |
| `DATA_DIR` | Optional | Override `./data` |
| `INVOICE_PDF_ENABLED` | Optional | Default `true` |

See `.env.example` for a full template.

## Workflow

1. Log in at `/login`
2. **New invoice** on `/invoices` (allocates sequential `INV-YYYY-####`)
3. Edit in `/editor?id=…` — Save, Download PDF, **Issue & copy link**
4. Send the copied link to the client (tokenized HTML; works without studio login)

## Data layout

```
data/
  settings.json          # counters, active invoice, seller defaults
  invoices/{id}.json     # full draft + metadata
```

`data/` is gitignored. Back up this folder in production.

## Production checklist

1. Set strong `STUDIO_PASSWORD`, `SESSION_SECRET`, and `INVOICE_ACCESS_SECRET`
2. Confirm `/api/health` returns `"productionHardened": true`
3. Ensure Chromium/Puppeteer dependencies are available on the host (or set `INVOICE_PDF_ENABLED=false` and use Print → Save as PDF)
4. Persist and back up `DATA_DIR`
5. Serve over HTTPS (`secure` session cookies in production)

```bash
npm run build
npm start
```

## Main routes

| Path | Description |
|------|-------------|
| `/login` | Studio password login |
| `/invoices` | Invoice library |
| `/editor` | Active / `?id=` invoice editor |
| `/api/invoices` | List / create / delete |
| `/api/invoices/draft` | Preview + save active draft |
| `/api/invoices/[id]/html` | HTML invoice (session or `?token=`) |
| `/api/invoices/[id]/pdf` | PDF download |
| `/api/invoices/[id]/share` | Guest URLs + issue |
| `/api/health` | Liveness + config flags |

## Stack

- Next.js 15 (App Router)
- Zod draft validation
- File-backed JSON store
- Puppeteer PDF generation
