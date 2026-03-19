# Phase 3: Developer Dashboard — Test Plan

## Prerequisites

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3002` and sign in with GitHub
3. Have at least one connected repository (or test the connect flow first)

---

## 1. Dashboard Home (`/`)

- [ ] "Changelogs" heading renders in DM Sans bold
- [ ] **No projects**: empty state shows with "Connect repository" CTA button and "generate from a public repo" link
- [ ] **Projects but no changelogs**: filtered empty state with "Generate changelog" button
- [ ] Filter tabs (All / Drafts / Published) update URL with `?filter=` and filter results
- [ ] Changelog cards show title, status badge, and metadata line (repo, date range, commit count)
- [ ] Metadata line uses JetBrains Mono 11px
- [ ] **First card** has subtle green glow on hover (`#10B98120` shadow)
- [ ] Cards link to `/changelogs/[id]`

## 2. Generate Page — Form Phase (`/changelogs/new`)

### Navigation
- [ ] Sidebar "Generate new" link navigates here
- [ ] Dashboard "Generate new" button navigates here
- [ ] `Cmd/Ctrl+N` from anywhere in dashboard navigates here

### Repository selector
- [ ] Dropdown loads connected projects on mount
- [ ] Projects display as `owner/repo` with GitBranch icon in mono font
- [ ] Selecting a project updates the dropdown label
- [ ] "Connect new repo" option opens the ConnectRepoDialog
- [ ] After connecting a new repo, project list refreshes

### Date range
- [ ] Five preset pills render: "Since last release" (default), "Last 7/14/30 days", "Custom"
- [ ] Selected pill has accent background (`bg-accent/15`)
- [ ] **Since last release + repo with tags**: shows "Since vX.Y.Z (Month D, YYYY)" below
- [ ] **Since last release + repo without tags**: shows "No tags found — using last 30 days"
- [ ] **Since last release + no repo selected**: no info text shown
- [ ] Tag loading shows spinner with "Detecting latest release..."
- [ ] **Custom**: two date inputs appear (from / to)

### Tone selector
- [ ] Three cards: Technical ("For developers"), Product ("For product teams"), Enterprise ("For stakeholders")
- [ ] Technical selected by default with accent border
- [ ] Clicking a card selects it

### Generate button
- [ ] Full-width green-to-blue gradient with glow shadow
- [ ] Disabled (no glow, reduced opacity) when no repo selected
- [ ] `Cmd/Ctrl+Enter` triggers generation when repo is selected

## 3. Generate Page — Streaming Phase

- [ ] Form transitions to streaming output on generate
- [ ] Green pulsing dot appears with JetBrains Mono status text
- [ ] Status updates: "Fetching commits..." → "Analyzing X commits..." → "Writing changelog entries..."
- [ ] Entry cards animate in with fade + slide up (200ms)
- [ ] Entries grouped by category with colored vertical accent bars (3px)
- [ ] Category order: Features → Fixes → Improvements → Breaking
- [ ] Entry cards have 3px colored left border and tinted background
- [ ] Each entry shows title and optional description
- [ ] On completion: status text changes to "Generated X entries from Y commits" in DM Sans semibold
- [ ] Pulsing dot becomes static green dot
- [ ] "Edit & Review" button (green gradient + glow) and "Generate again" button appear
- [ ] "Generate again" resets back to form phase

### Error handling
- [ ] Non-200 response shows red alert card with error message and "Try again" button
- [ ] Network error shows error state
- [ ] "Try again" resets back to form

## 4. Changelog Editor (`/changelogs/[id]`)

### Header
- [ ] Title is an editable borderless input in DM Sans 22px bold
- [ ] Status badge: "Draft" (amber), "Published" (green), "Pending review" (blue)
- [ ] Metadata line: commit count, date range, repo — JetBrains Mono 11px
- [ ] Version input with "v0.0.0" placeholder
- [ ] Save indicator area (empty initially)

### Editing entries
- [ ] Entry titles are editable inline
- [ ] Entry descriptions are editable inline (placeholder: "Add a description...")
- [ ] Editing triggers autosave after 3 seconds — "Saving..." then "Saved" with green check
- [ ] Refresh page after save — changes persist
- [ ] Hover an entry card: delete and move icons appear
- [ ] **Delete**: removes the entry, triggers autosave
- [ ] **Move**: dropdown shows other categories with colored dots — moving an entry transfers it

### Adding entries
- [ ] "+ Add entry" link on each category header
- [ ] Clicking opens inline form with title + description inputs
- [ ] `Enter` in either input submits the new entry
- [ ] `Escape` cancels
- [ ] "Add" button disabled when title is empty
- [ ] "Cancel" button closes the form

### Export
- [ ] "Export" button downloads a `.md` file
- [ ] File contains `# Title` header followed by categorized entries in markdown

### Publish
- [ ] "Publish" button has green gradient + glow
- [ ] Clicking publishes — toast appears in bottom-right: "Changelog published"
- [ ] Status badge updates from "Draft" to "Published"
- [ ] Publish button disappears after publishing
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
- [ ] **Direct URL to nonexistent changelog**: `/changelogs/bad-id` → 404 page
- [ ] **Direct URL to another user's changelog**: → 404 page
- [ ] **Theme toggle**: switch dark/light/system — all Phase 3 components respect theme
- [ ] **Mobile viewport**: generate form and editor remain usable at narrow widths
- [ ] **Rapid edits in editor**: multiple fast edits debounce correctly (single save, not multiple)
- [ ] **Publish on already-published changelog**: publish button should not appear

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
