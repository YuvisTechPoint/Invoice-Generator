# Invoice Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**Open-source invoice studio** — create, preview, download PDFs, and share signed client links.  
Self-host locally, on Docker, or deploy to **Vercel** in minutes.

[Report a bug](https://github.com/YuvisTechPoint/Invoice-Generator/issues) · [Request a feature](https://github.com/YuvisTechPoint/Invoice-Generator/issues/new)

---

## Features

| Feature | Description |
|---------|-------------|
| **Visual editor** | Live HTML preview while you edit line items, taxes, and totals |
| **Invoice library** | Search, duplicate, void, and manage all saved invoices |
| **PDF export** | A4 print-ready PDFs (Puppeteer locally, Chromium on Vercel) |
| **Client share links** | Signed URLs so clients can view invoices without logging in |
| **Settings** | Seller defaults, invoice numbering, and branding |
| **Flexible auth** | Password-protected studio or open mode for private networks |
| **Portable storage** | Local JSON files (`./data`) or **Vercel Blob** on serverless |

---

## Quick start (local)

```bash
git clone https://github.com/YuvisTechPoint/Invoice-Generator.git
cd Invoice-Generator
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local dev uses `STUDIO_AUTH_DISABLED=true` in `.env.example` — no login required.

If the dev server shows stale or missing module errors, run:

```bash
npm run dev:clean
```

---

## Deploy to Vercel

This is the recommended path for a public `*.vercel.app` deployment.

### 1. Import the repository

1. Push this repo to GitHub (or fork it).
2. Go to [vercel.com/new](https://vercel.com/new) and import **Invoice-Generator**.
3. Leave the default **Next.js** framework preset.

### 2. Connect persistent storage (required)

**Without storage, invoices cannot persist on Vercel** — the serverless filesystem is read-only.

Pick **one** option in your Vercel project (**Storage** tab):

| Option | Steps |
|--------|--------|
| **Blob** (recommended) | Create **Blob** → connect to this project → redeploy |
| **Neon Postgres** | Create **Neon** → connect to this project → redeploy |

Vercel injects `BLOB_READ_WRITE_TOKEN` or `POSTGRES_URL` automatically.

### 3. Environment variables

Copy from [`.env.vercel.example`](.env.vercel.example) into **Project → Settings → Environment Variables**:

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://your-app.vercel.app` |
| `INVOICE_ACCESS_SECRET` | Yes | Random string, 24+ chars |
| `STUDIO_PASSWORD` | Yes* | Strong studio password |
| `SESSION_SECRET` | Yes* | Random string, 24+ chars |
| `BLOB_READ_WRITE_TOKEN` | Auto | Set when Blob is connected |
| `INVOICE_PDF_ENABLED` | No | `true` (default) |

\* Or set `STUDIO_AUTH_DISABLED=true` only on trusted private deployments.

**Generate secrets (PowerShell):**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Deploy

Click **Deploy**. Vercel runs `npm run build` automatically.

### 5. Verify

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:

```json
{
  "ok": true,
  "configured": true,
  "storage": "blob"
}
```

If `configured` is `false`, check the `issues` array in the response and fix env vars.

> **PDF on Vercel Hobby:** PDF routes may need up to 60s (Pro plan). On Hobby, use **Print → Save as PDF** from the HTML view if download times out.

---

## Docker (self-hosted)

```bash
cp .env.production.example .env.production
# Edit secrets and NEXT_PUBLIC_SITE_URL

npm run docker:up
```

Data persists in the `invoice-data` volume at `/data`.

---

## Environment reference

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Public HTTPS origin for share links |
| `INVOICE_ACCESS_SECRET` | HMAC secret for client invoice tokens |
| `STUDIO_AUTH_DISABLED` | `true` = no login (dev / private LAN only) |
| `STUDIO_PASSWORD` | Studio login password |
| `SESSION_SECRET` | Session cookie signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (auto on Vercel) |
| `DATA_DIR` | Local/Docker JSON storage path |
| `STORAGE_DRIVER` | `filesystem` or `blob` (auto-detected by default) |
| `INVOICE_PDF_ENABLED` | `false` to disable PDF routes |

See [`.env.example`](.env.example), [`.env.production.example`](.env.production.example), and [`.env.vercel.example`](.env.vercel.example).

---

## Workflow

1. **Home** (`/`) — overview and quick actions  
2. **Library** (`/invoices`) — browse, search, duplicate, void  
3. **Editor** (`/editor?id=…`) — edit with live preview, save, PDF, share  
4. **Settings** (`/settings`) — seller defaults and invoice prefix  
5. **Share** — issue a signed client link from the editor  

---

## Project structure

```
src/
  app/              # Next.js App Router pages & API routes
  components/       # Shared UI (nav, footer, breadcrumbs)
  features/invoice/ # HTML/PDF generation, invoice types
  lib/
    data/           # JSON storage (filesystem + Vercel Blob)
    server/         # Invoice workflow, orders, settings
```

Local data layout:

```
data/
  settings.json
  invoices/{id}.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run dev:clean` | Clear `.next` cache and start dev |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run typecheck` | TypeScript check |
| `npm run docker:up` | Build & start Docker Compose |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repo  
2. Create a branch (`git checkout -b feature/my-change`)  
3. Commit your changes  
4. Open a pull request  

Please run `npm run typecheck` and `npm run build` before submitting.

---

## Security

- Rate limits on API, PDF, and login endpoints  
- Security headers (X-Frame-Options, nosniff, etc.)  
- Signed tokens for guest invoice access  
- Enable studio auth (`STUDIO_AUTH_DISABLED=false`) on any public deployment  
- Never commit `.env.local`, `.env.production`, or real secrets  

---

## License

[MIT](LICENSE) © [YuvisTechPoint](https://github.com/YuvisTechPoint)

---

## Stack

- [Next.js 15](https://nextjs.org/) (App Router)  
- [TypeScript](https://www.typescriptlang.org/) + [Zod](https://zod.dev/)  
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) or local JSON files  
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium) + Puppeteer for PDFs  
