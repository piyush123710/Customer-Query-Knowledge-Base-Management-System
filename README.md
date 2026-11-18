# ResolveBase — Customer Query & Knowledge Base Management System

ResolveBase is a full-stack customer support portal and documentation management system built with **React**, **TypeScript**, **Tailwind CSS**, **Node.js**, and **Express.js**. It includes **110 seeded technical FAQs and troubleshooting guides** across five support categories, real-time knowledge base search, automated query categorization, and an admin console for resource governance.

---

## Core Capabilities

- **Searchable Knowledge Base (110+ Resources)**
  - Full-text search across article titles, summaries, error codes (e.g., `0xc000007b`, `AADSTS50105`, `ERR_CERT_AUTHORITY_INVALID`), keywords, and resolution steps.
  - Keyboard shortcut (`/`) to focus search, filter by resource type (`All Types`, `FAQs`, `Guides`), sort by `Most Viewed`, `Most Helpful`, `Recently Updated`, or `Best Match`, and browse paginated results.
  - Slide-over **Article Reader** with interactive step-by-step troubleshooting checklists, one-click guide copy, related category articles, and persistent helpfulness voting.

- **5 Support Categories**
  - **Hardware** (22 docs) — Workstations, USB-C/Thunderbolt docks, 4K displays, NVMe storage, power delivery, and peripherals.
  - **Software** (22 docs) — Desktop clients, runtime dependencies, updates/rollbacks, local databases, CLI tooling, and exports.
  - **Network** (22 docs) — Corporate VPN, split-DNS, Wi-Fi 6E, SSL/TLS proxies, switching, and API gateways.
  - **Account** (22 docs) — SAML SSO, SCIM provisioning, MFA recovery, role-based permissions, and billing settings.
  - **Security** (22 docs) — Device encryption (BitLocker/FileVault), phishing response, endpoint EDR, webhook HMACs, and compliance.

- **Customer Query Intake & Auto-Categorization**
  - Live query classification (`POST /api/queries/suggest`) analyzes issue summaries and descriptions to detect the most likely support category and suggest matching KB guides before ticket submission.
  - **Query Queue** supports filtering by category, workflow status (`Open`, `In Progress`, `Resolved`), and search, with a triage drawer to update assignees, priorities, categories, and resolution notes.

- **Admin Documentation Console**
  - Live collection metrics and category coverage breakdown.
  - Full CRUD editor for creating, editing, publishing, archiving, and deleting FAQs and troubleshooting guides, complete with a dynamic step-by-step checklist builder.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express.js (`server.ts`)
- **Persistence:** Disk-backed JSON document store (`data/kb_store.json`) auto-seeded from `server/seedData.ts` on initial startup

---

## Project Structure

```text
├── server.ts                    # Express API server & Vite dev/static middleware
├── server/
│   ├── db.ts                    # Document store, search scoring, & query classifier
│   └── seedData.ts              # 110 seeded FAQs/guides + initial support queries
├── src/
│   ├── App.tsx                  # Root workspace navigation & shared drawers/modals
│   ├── api.ts                   # Typed frontend API client
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── utils/format.ts          # Date, ratio, and category helpers
│   └── components/
│       ├── TopBar.tsx
│       ├── KnowledgeBaseView.tsx
│       ├── CategoriesView.tsx
│       ├── QueryQueueView.tsx
│       ├── AdminConsoleView.tsx
│       ├── ArticleReaderDrawer.tsx
│       ├── ArticleEditorModal.tsx
│       └── SubmitQueryModal.tsx
├── index.html
├── metadata.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation & Development

```bash
# Install dependencies
npm install

# Start Express + Vite development server on port 3000
npm run dev
```

Open `http://localhost:3000` in your browser.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Express backend and Vite dev middleware via `tsx server.ts` |
| `npm run build` | Builds the production frontend bundle into `dist/` |
| `npm run start` | Starts the production Express server (`node server.ts`) |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |

---

## REST API Reference

### Knowledge Base Articles
- `GET /api/articles` — Query articles (`q`, `category`, `type`, `status`, `sort`, `limit`, `offset`)
- `GET /api/articles/:id` — Fetch a single article (`?view=1` increments view count)
- `POST /api/articles` — Create a new FAQ or troubleshooting guide
- `PUT /api/articles/:id` — Update an existing resource
- `DELETE /api/articles/:id` — Delete a resource
- `POST /api/articles/:id/feedback` — Record helpfulness vote (`{ "helpful": true | false }`)

### Categories
- `GET /api/categories` — Retrieve live counts, subcategories, views, and open query totals per category

### Customer Queries
- `POST /api/queries/suggest` — Auto-detect category and return matching KB articles for `{ subject, description }`
- `GET /api/queries` — List and filter support queries (`q`, `category`, `status`, `priority`)
- `POST /api/queries` — Submit a new categorized support query
- `PATCH /api/queries/:id` — Update query category, status, priority, assignee, or resolution note
- `DELETE /api/queries/:id` — Delete a support query

### Health
- `GET /api/health` — Server health check
