# Phase 3: Developer Dashboard — Test Plan

## Prerequisites

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3002` and sign in with GitHub
3. Have at least one connected repository (or test the connect flow first)

---

## 1. Dashboard Home (`/`)

- [X] "Changelogs" heading renders in DM Sans bold
- [X] **No projects**: empty state shows with "Connect repository" CTA button and "generate from a public repo" link
- [X] **Projects but no changelogs**: filtered empty state with "Generate changelog" button
- [X] Filter tabs (All / Drafts / Published) update URL with `?filter=` and filter results
- [X] Changelog cards show title, status badge, and metadata line (repo, date range, commit count)
- [X] Metadata line uses JetBrains Mono 11px
- [X] **First card** has subtle green glow on hover (`#10B98120` shadow)
- [X] Cards link to `/changelogs/[id]`

## 2. Generate Page — Form Phase (`/changelogs/new`)

### Navigation
- [X] Sidebar "Generate new" link navigates here
- [X] Dashboard "Generate new" button navigates here
- [ ] `Cmd/Ctrl+N` from anywhere in dashboard navigates here  (opens new chrome window)

### Repository selector
- [X] Dropdown loads connected projects on mount
- [X] Projects display as `owner/repo` with GitBranch icon in mono font
- [X] Selecting a project updates the dropdown label
- [X] "Connect new repo" option opens the ConnectRepoDialog
- [X] After connecting a new repo, project list refreshes

### Date range
- [X] Five preset pills render: "Since last release" (default), "Last 7/14/30 days", "Custom"
- [X] Selected pill has accent background (`bg-accent/15`)
- [ ] **Since last release + repo with tags**: shows "Since vX.Y.Z (Month D, YYYY)" below
- [X] **Since last release + repo without tags**: shows "No tags found — using last 30 days"
- [X] **Since last release + no repo selected**: no info text shown
- [ ] Tag loading shows spinner with "Detecting latest release..."
- [X] **Custom**: two date inputs appear (from / to)

### Tone selector
- [X] Three cards: Technical ("For developers"), Product ("For product teams"), Enterprise ("For stakeholders")
- [X] Technical selected by default with accent border
- [X] Clicking a card selects it

### Generate button
- [X] Full-width green-to-blue gradient with glow shadow
- [X] Disabled (no glow, reduced opacity) when no repo selected
- [ ] `Cmd/Ctrl+Enter` triggers generation when repo is selected

## 3. Generate Page — Streaming Phase

- [X] Form transitions to streaming output on generate
- [X] Green pulsing dot appears with JetBrains Mono status text
- [X] Status updates: "Fetching commits..." → "Analyzing X commits..." → "Writing changelog entries..."
- [X] Entry cards animate in with fade + slide up (200ms)
- [X] Entries grouped by category with colored vertical accent bars (3px)
- [X] Category order: Features → Fixes → Improvements → Breaking
- [X] Entry cards have 3px colored left border and tinted background
- [X] Each entry shows title and optional description
- [X] On completion: status text changes to "Generated X entries from Y commits" in DM Sans semibold
- [X] Pulsing dot becomes static green dot
- [X] "Edit & Review" button (green gradient + glow) and "Generate again" button appear
- [X] "Generate again" resets back to form phase

### Error handling
- [X] Non-200 response shows red alert card with error message and "Try again" button
- [X] Network error shows error state
- [X] "Try again" resets back to form

## 4. Changelog Editor (`/changelogs/[id]`)

### Header
- [X] Title is an editable borderless input in DM Sans 22px bold
- [X] Status badge: "Draft" (amber), "Published" (green), "Pending review" (blue)
- [X] Metadata line: commit count, date range, repo — JetBrains Mono 11px
- [X] Version input with "v0.0.0" placeholder
- [X] Save indicator area (empty initially)

### Editing entries
- [X] Entry titles are editable inline
- [X] Entry descriptions are editable inline (placeholder: "Add a description...")
- [X] Editing triggers autosave after 3 seconds — "Saving..." then "Saved" with green check
- [X] Refresh page after save — changes persist
- [X] Hover an entry card: delete and move icons appear
- [X] **Delete**: removes the entry, triggers autosave
- [X] **Move**: dropdown shows other categories with colored dots — moving an entry transfers it

### Adding entries
- [X] "+ Add entry" link on each category header
- [X] Clicking opens inline form with title + description inputs
- [X] `Enter` in either input submits the new entry
- [X] `Escape` cancels
- [X] "Add" button disabled when title is empty
- [X] "Cancel" button closes the form

### Export
- [X] "Export" button downloads a `.md` file
- [X] File contains `# Title` header followed by categorized entries in markdown

### Publish
- [X] "Publish" button has green gradient + glow
- [X] Clicking publishes — toast appears in bottom-right: "Changelog published"
- [X] Status badge updates from "Draft" to "Published"
- [X] Publish button disappears after publishing
- [ ] `Cmd/Ctrl+Shift+P` triggers publish on draft changelogs

## 5. Keyboard Shortcuts

| Shortcut | Context | Expected behavior |
|---|---|---|
| `Cmd/Ctrl+N` | Anywhere in dashboard | Navigate to `/changelogs/new` |
| `Cmd/Ctrl+Enter` | Generate page, form phase | Trigger generation (if repo selected) |
| `Cmd/Ctrl+Shift+P` | Editor page | Trigger publish (if draft) |
| `Escape` | Anywhere | Dispatch `dialog:close` event |

## 6. Edge Cases

- [ ] **No commits in range**: narrow custom date range → "No meaningful commits found" status, completes with no entries
- [X] **Direct URL to nonexistent changelog**: `/changelogs/bad-id` → 404 page
- [X] **Direct URL to another user's changelog**: → 404 page
- [X] **Theme toggle**: switch dark/light/system — all Phase 3 components respect theme
- [ ] **Mobile viewport**: generate form and editor remain usable at narrow widths
- [X] **Rapid edits in editor**: multiple fast edits debounce correctly (single save, not multiple)
- [X] **Publish on already-published changelog**: publish button should not appear

## 7. API Routes (can verify via DevTools Network tab)

| Method | Route | Check |
|---|---|---|
| `GET` | `/api/projects` | Returns user's projects |
| `GET` | `/api/projects/[id]/tags` | Returns tags for project's repo |
| `POST` | `/api/generate` | SSE stream with `event:` + `data:` lines |
| `GET` | `/api/changelogs/[id]` | Returns changelog with project |
| `PATCH` | `/api/changelogs/[id]` | Updates title/content/rawContent/version |
| `POST` | `/api/changelogs/[id]/publish` | Sets status=published, publishedAt=now |
| All routes | Unauthenticated | Returns 401 |
| All routes | Wrong user's resource | Returns 404 |
