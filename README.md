# NoteFlow — Full-Stack Notes Application

NoteFlow is a modern, full-stack notes workspace built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase PostgreSQL**.

Designed with clean typography, dynamic responsive navigation, and cloud synchronization, NoteFlow provides frictionless note-taking using **Supabase Anonymous Authentication** paired with owner-isolated **Row Level Security (RLS)**. Every user immediately receives an isolated, persistent cloud workspace without needing to complete an email sign-up form.

---

## Features

- **Full Note CRUD:** Create, read, edit, and organize notes with instant UI updates and database persistence.
- **Full-Note Reading Modal:** Click any note to view complete, un-clamped note content, tags, creation timestamps, and last-edited metadata.
- **Instant Search:** Case-insensitive search across note titles and content, handling special characters, punctuation, and Unicode emojis cleanly.
- **Tagging & Filtering:** Categorize notes with custom tags. Filter notes dynamically by tag in the workspace or dedicated "Tags & Categories" view.
- **Pinning & Favorites:** Mark important notes to keep them prioritized in dedicated sidebar views ("Pinned", "Favorites").
- **Two-Stage Deletion (Trash & Permanent Delete):** Soft-delete notes to Trash for safety, restore them anytime, or permanently delete them with a confirmation dialog.
- **Responsive Workspace Layout:** Toggle between grid and list views; responsive layout with a collapsible sidebar drawer for mobile viewports.
- **Dark Mode Support:** Smooth transitions between light and dark themes with persistent user preferences.
- **Database Persistence with Multi-Tenant Isolation:** Powered by Supabase PostgreSQL and Row Level Security (`auth.uid() = user_id`), ensuring User A can never access or modify User B's notes.
- **Instant Anonymous Authentication:** Automatically creates a cryptographically verified anonymous user session via `@supabase/ssr` cookies.
- **Idempotent Legacy Migration:** Safely imports legacy `localStorage` notes on first launch without creating duplicate records on retry.
- **Toast Notifications & Error Boundaries:** Clear feedback via Sonner toast notifications and friendly retry banners for network interruptions.

---

## Technology Stack

- **Framework:** [Next.js 15.2.4](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Frontend Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/) (Strict type safety)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL & Supabase Anonymous Authentication)
- **Supabase SSR:** `@supabase/ssr` v0.12.7 (Cookie-based session synchronization across Client, Middleware, and Route Handlers)
- **Validation:** [Zod v3](https://zod.dev/) (Schema validation for all API inputs and query parameters)
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/)
- **UI Components:** Custom shadcn/ui primitives built on Radix UI (`Dialog`, `AlertDialog`, `DropdownMenu`, `Select`, `Card`, `Badge`)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Notifications:** [Sonner](https://sonner.emilkowal.ski/)
- **Package Manager:** [pnpm](https://pnpm.io/)

---

## Application Architecture

NoteFlow follows a clean layered architecture separating the database, server API, typed client adapter, state management hooks, and presentation components:

```
noteflow/
├── app/
│   ├── api/
│   │   └── notes/
│   │       ├── route.ts             # GET /api/notes (list/filter) & POST /api/notes (create)
│   │       └── [id]/
│   │           └── route.ts         # GET, PATCH, DELETE /api/notes/[id]
│   ├── globals.css                  # Core CSS variables, design tokens, and theme styles
│   ├── layout.tsx                   # Root HTML layout with Sonner <Toaster /> and font definitions
│   └── page.tsx                     # Landing page toggle and primary AppWrapper entry
├── components/
│   ├── ui/                          # Radix-based UI components (dialog, alert-dialog, button, etc.)
│   ├── dashboard-stats.tsx          # Summary stats display
│   ├── sidebar-navigation.tsx       # Sidebar navigation tabs and counters
│   ├── theme-provider.tsx           # Theme and dark mode state provider
│   └── website-components.tsx       # Marketing landing page components
├── hooks/
│   └── use-notes.ts                 # React hook for notes state, CRUD actions, and legacy migration
├── lib/
│   ├── api/
│   │   ├── notes.ts                 # Typed client API service for frontend requests
│   │   └── response.ts              # Standardized API response helpers (apiSuccess, apiError)
│   ├── notes/
│   │   └── mapper.ts                # Database snake_case to Client camelCase transformers
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client & anonymous session initialization
│   │   ├── middleware.ts            # Next.js middleware session refresh handler
│   │   ├── server.ts                # Server Supabase client & getAuthenticatedUser helper
│   │   └── types.ts                 # TypeScript types matching PostgreSQL database schema
│   ├── validations/
│   │   └── note.ts                  # Zod schemas for request validation
│   └── utils.ts                     # Utility helpers (cn class merger)
├── middleware.ts                    # Edge middleware for refreshing Supabase auth cookies
├── supabase/
│   └── migrations/
│       └── 0001_create_notes.sql    # Database schema, indexes, and Row Level Security policies
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules protecting .env.local and builds
├── package.json                     # Project scripts and dependencies
├── tailwind.config.ts               # Tailwind CSS theme configuration
└── tsconfig.json                    # TypeScript compiler configuration
```

---

## Frontend-to-Backend Communication

1. **Session Bootstrapping:** When the app loads, `ensureAnonymousSession()` in `lib/supabase/client.ts` verifies or creates an anonymous Supabase user. The session token is stored in a cookie (`sb-<project-ref>-auth-token`).
2. **Middleware Refresh:** `middleware.ts` runs on incoming requests to refresh the session cookie if near expiration.
3. **API Requests:** The frontend uses the typed `notesApi` client in `lib/api/notes.ts`. Requests target same-origin Route Handlers under `/api/notes`.
4. **Server Authentication:** Route Handlers call `getAuthenticatedUser()` in `lib/supabase/server.ts`, which cryptographically validates the caller's JWT against Supabase Auth.
5. **Database Query with RLS:** The server initializes a cookie-aware Supabase client. Queries execute with PostgreSQL Row Level Security enforced directly at the database engine level.
6. **Anti-Caching:** All API responses include `Cache-Control: private, no-cache, no-store, must-revalidate` headers to ensure personal data is never cached by public proxies.

---

## Database Schema & Row Level Security

The application schema is defined in `supabase/migrations/0001_create_notes.sql`:

### `notes` Table Schema

| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique note identifier |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner ID matching Supabase Auth user |
| `title` | `TEXT` | `NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200)` | Note title |
| `content` | `TEXT` | `NOT NULL DEFAULT ''` | Note body |
| `tags` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Array of lowercase category tags |
| `color` | `TEXT` | `NOT NULL DEFAULT 'violet' CHECK (color IN (...))` | UI accent color |
| `is_pinned` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Pinned priority status |
| `is_favorite` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Favorite status |
| `is_trashed` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Soft-delete trash flag |
| `created_at` | `TIMESTAMPTZ`| `NOT NULL DEFAULT timezone('utc'::text, now())` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ`| `NOT NULL DEFAULT timezone('utc'::text, now())` | Last-modified timestamp (auto-updated via trigger) |

### Row Level Security (RLS) Policies

Row Level Security is enabled on the `notes` table. Strict owner isolation is enforced using `auth.uid() = user_id`:

- **SELECT:** `notes_owner_select` — Users can only select their own notes (`auth.uid() = user_id`).
- **INSERT:** `notes_owner_insert` — Users can only insert notes where `user_id = auth.uid()`.
- **UPDATE:** `notes_owner_update` — Users can only update notes where `auth.uid() = user_id`.
- **DELETE:** `notes_owner_delete` — Users can only delete notes where `auth.uid() = user_id`.

---

## REST API Reference

All requests and responses use JSON. Unauthenticated requests return `401 Unauthorized`.

### 1. List / Filter Notes
- **Endpoint:** `GET /api/notes`
- **Query Parameters:**
  - `view` (optional): `all` (default), `pinned`, `recent`, `favorites`, `trash`
  - `tag` (optional): Filter by specific tag name
  - `search` (optional): Search string matching title or content
  - `sort` (optional): `edited` (default), `created`, `title`
- **Success Response (200 OK):**
  ```json
  {
    "notes": [
      {
        "id": "8b0b076f-9bb4-4915-9a73-9dc166fcf2d3",
        "title": "Architecture Roadmap",
        "content": "Database design and API endpoints",
        "tags": ["architecture", "backend"],
        "color": "violet",
        "pinned": true,
        "favorite": false,
        "trashed": false,
        "createdAt": "2026-10-25T17:16:34.000Z",
        "updatedAt": "2026-10-25T17:16:34.000Z"
      }
    ]
  }
  ```

### 2. Create Note
- **Endpoint:** `POST /api/notes`
- **Body:**
  ```json
  {
    "title": "New Idea",
    "content": "Details about the concept",
    "tags": ["ideas", "product"],
    "color": "emerald",
    "pinned": false,
    "favorite": false
  }
  ```
- **Success Response:** `201 Created` with `{ "note": { ... } }`
- **Error Response:** `400 Bad Request` if title is blank or validation fails.

### 3. Get Note by ID
- **Endpoint:** `GET /api/notes/:id`
- **Success Response:** `200 OK` with `{ "note": { ... } }`
- **Error Response:** `404 Not Found` if note does not exist or belongs to another user.

### 4. Update Note
- **Endpoint:** `PATCH /api/notes/:id`
- **Body:** Partial note update object (e.g. `{ "title": "Updated", "pinned": true }` or `{ "trashed": true }`).
- **Success Response:** `200 OK` with `{ "note": { ... } }`

### 5. Permanent Delete Note
- **Endpoint:** `DELETE /api/notes/:id`
- **Safety Precondition:** Note **must** be moved to Trash (`is_trashed = true`) before it can be permanently deleted.
- **Success Response:** `204 No Content`
- **Error Response:** `409 Conflict` if the note is not currently in Trash.

---

## Local Setup & Development

### Prerequisites

- **Node.js:** `v18.18.0` or higher (Node `v20+` or `v24+` recommended)
- **Package Manager:** `pnpm` (`npm install -g pnpm`)

### 1. Clone & Install

```bash
git clone <your-repository-url>
cd noteflow
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

> **Security Notice:** Never commit `.env.local` to Git. The `.gitignore` file is configured to exclude all `.env*` files except `.env.example`.

### 3. Supabase Database Setup

1. Create a new project at [supabase.com](https://supabase.com/).
2. Navigate to **Authentication -> Providers -> Email / Auth Providers**.
3. Under **Anonymous Sign-ins**, enable the **"Enable Anonymous Sign-in"** toggle and click **Save**.
4. In the Supabase dashboard, navigate to the **SQL Editor**.
5. Copy the contents of [`supabase/migrations/0001_create_notes.sql`](supabase/migrations/0001_create_notes.sql) and paste them into the SQL Editor.
6. Click **Run** to execute the migration and establish the `notes` table, triggers, and Row Level Security policies.

### 4. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Type Checks & Production Build

Verify TypeScript compilation:
```bash
pnpm exec tsc --noEmit
```

Test the production build:
```bash
pnpm build
```

Start the production server:
```bash
pnpm start
```

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New Project"** and import your NoteFlow repository.
3. Configure the project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `next build` (or `pnpm build`)
   - **Output Directory:** `.next`
   - **Install Command:** `pnpm install`
4. In the **Environment Variables** section, add the two required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (e.g. `https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable API key
5. Click **Deploy**.

---

## Security & Anonymous Session Considerations

- **Owner Isolation:** PostgreSQL Row Level Security enforces that queries execute strictly under the authenticated session's user ID (`auth.uid() = user_id`). Users cannot access, modify, or delete another user's notes, even if note UUIDs are guessed.
- **Session Lifespan & Cookies:** Anonymous sessions rely on cookies stored in the user's browser. If a user clears their browser cookies or uses private/incognito browsing, their session ID will reset, and prior anonymous notes will remain in the database tied to the expired anonymous user ID.
- **Production Abuse Protection:** For production deployments with anonymous authentication enabled, Supabase strongly recommends enabling **CAPTCHA protection** (e.g., Cloudflare Turnstile or hCaptcha) under **Authentication -> Attack Protection** to prevent automated script abuse from generating excessive anonymous accounts.
- **Future Enhancement (Account Linking):** Supabase allows anonymous users to permanently link an email address or OAuth provider (e.g., GitHub, Google) to their existing anonymous user ID without losing previously created notes.

---

## Screenshot Capture Guide

When capturing screenshots for project documentation or portfolio display, save images to the `public/screenshots/` directory:

| Filename | Description |
| :--- | :--- |
| `landing-page.png` | Marketing landing page with hero and feature highlights |
| `notes-dashboard.png` | Workspace overview displaying note cards, sidebar counters, and stats |
| `note-editor-modal.png` | Note creation/editing popup dialog with title, content, tags, and color accent |
| `full-note-reading.png` | Full-note reading dialog displaying complete note text and metadata |
| `search-and-filtering.png` | Filtered workspace view highlighting instant search or tag filtering |
| `trash-view.png` | Trash management view showing restore and permanent delete actions |
| `mobile-layout.png` | Responsive mobile drawer navigation and card view (viewport 375x812) |
| `dark-mode.png` | Notes workspace in dark mode |

Example markdown embed syntax:
```markdown
![NoteFlow Dashboard](public/screenshots/notes-dashboard.png)
```

---

## License

MIT License. Developed for the CodeNova Full Stack Development Batch 01 Internship, Task 1: Notes Application.
