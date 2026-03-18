# Phase 3: Developer Dashboard

## Deliverable

A developer can: select a repo, pick a date range with smart defaults, generate a changelog with real-time streaming output, edit the result, and publish it. The full generate → edit → publish loop works end-to-end.

## Dependencies

Phase 2 must be complete: the `/api/generate` endpoint streams structured changelog entries.

## Tasks

### 3.1 — Generate page (`/changelogs/new`)

Create `src/app/(dashboard)/changelogs/new/page.tsx`:

This is the primary developer-facing page. It has two states: the form (pre-generation) and the streaming output (during/after generation).

**Form layout** (single column, centered, max-w-2xl):

1. **Repository selector**
   - Dropdown of connected projects
   - "Connect new repo" link that opens the connect dialog
   - Show the repo as `owner/repo` with the GitHub icon

2. **Date range section**
   - Smart presets as selectable pills/chips: "Since last release", "Last 7 days", "Last 14 days", "Last 30 days", "Custom"
   - "Since last release" is pre-selected by default
   - When "Since last release" is selected, show the detected tag name and date below: "Since v2.3.0 (March 10, 2026)"
   - When "Custom" is selected, show two date pickers (from/to)
   - Fetch the latest tags when a repo is selected via `GET /api/projects/{id}/tags`

3. **Tone selector** (nice-to-have, but include the UI with "Technical" as the only option for now)
   - Three radio cards or a segmented control: Technical, Product, Enterprise
   - Brief description under each: "For developers", "For product teams", "For stakeholders"
   - Default: Technical

4. **Generate button**
   - Full-width, prominent
   - Text: "Generate changelog"
   - Disabled state when no repo selected or generation in progress
   - During generation: shows "Generating..." with a subtle pulse animation

**Design notes**:
- The form should feel lightweight, not enterprise-SaaS-heavy. No unnecessary labels or help text.
- Date range presets should look like pills/chips, not a dropdown. The most common action (since last release) should be visually prominent.
- Leave generous vertical spacing between sections.

### 3.2 — Streaming output component

Create `src/components/dashboard/streaming-output.tsx`:

When the user clicks "Generate", the form transitions (with a smooth animation) to the output view. This component connects to the SSE stream and renders entries as they arrive.

**Layout during streaming**:

1. **Status bar** at the top
   - Shows the current pipeline stage: "Fetching commits..." → "Analyzing 47 commits..." → "Writing changelog entries..."
   - Subtle progress indication (not a progress bar — just the text updating with a gentle fade transition)
   - Once complete: "Generated 12 entries from 47 commits"

2. **Entries appearing in real time**
   - As `entry` events arrive, new changelog entry cards animate in (fade + slide up, 200ms)
   - Entries are grouped by category with category headers
   - Category order: Breaking Changes → New Features → Improvements → Bug Fixes
   - Each entry shows: category badge, title, description (if present)

3. **After stream completes**
   - "Edit & Review" button appears, navigating to the edit page
   - "Generate again" secondary button to re-run with different settings

**Client-side SSE connection**:

```typescript
"use client";

import { useCallback, useState } from "react";

interface StreamEntry {
  category: string;
  title: string;
  description?: string;
}

export function useChangelogStream() {
  const [status, setStatus] = useState<string>("");
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [changelogId, setChangelogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (body: object) => {
    setIsStreaming(true);
    setEntries([]);
    setError(null);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ") && eventType) {
          const data = JSON.parse(line.slice(6));
          if (eventType === "status") setStatus(data.message);
          if (eventType === "entry") setEntries((prev) => [...prev, data]);
          if (eventType === "complete") setChangelogId(data.changelogId);
          if (eventType === "error") setError(data.message);
          eventType = "";
        }
      }
    }

    setIsStreaming(false);
  }, []);

  return { generate, status, entries, isStreaming, changelogId, error };
}
```

### 3.3 — Changelog editor page (`/changelogs/[id]`)

Create `src/app/(dashboard)/changelogs/[id]/page.tsx`:

This page loads a saved changelog (draft or published) and lets the developer edit it before publishing.

**Layout** (max-w-3xl, centered):

1. **Header bar**
   - Title field (editable inline, large text)
   - Status badge: "Draft" (amber) or "Published" (green)
   - Version field (optional, editable): e.g., "v2.3.0"
   - Metadata: "47 commits · Mar 10 – Mar 17, 2026"
   - Actions: "Publish" primary button, "Export markdown" secondary, "Delete" danger (in dropdown)

2. **Category sections**
   - Each category is a collapsible section with a colored left border
   - Category header: emoji + name + entry count badge
   - Colors: Breaking = red, Features = green, Improvements = blue, Fixes = amber

3. **Entry cards** (within each category)
   - Each entry is an editable card
   - Title: editable text input (or contentEditable for a cleaner feel)
   - Description: editable textarea (auto-grows)
   - Actions on each card (shown on hover): "Delete", "Move to..." (dropdown to change category)
   - Drag-and-drop reordering within a category (use @dnd-kit/core if time permits, otherwise just move up/down buttons)

4. **Add entry**
   - "Add entry" button at the bottom of each category
   - Opens an inline form to type a manual entry

**API routes for editing**:

`PATCH /api/changelogs/[id]` — Updates title, content, rawContent, version
`POST /api/changelogs/[id]/publish` — Sets status to "published" and publishedAt to now

**Autosave**: Debounce edits and auto-save via PATCH every 3 seconds after the last edit. Show a subtle "Saving..." / "Saved" indicator in the header.

### 3.4 — Changelog list page (dashboard home)

Update `src/app/(dashboard)/page.tsx`:

The main dashboard view showing all changelogs.

**Layout**:

1. **Page header**: "Changelogs" title + "Generate new" button (top right)

2. **Filter tabs**: "All", "Drafts", "Published" — simple text tabs

3. **Changelog cards** in a vertical list:
   - Title (clickable, navigates to edit page)
   - Status badge
   - Version (if set)
   - Date range: "Mar 10 – Mar 17, 2026"
   - Repo: "owner/repo"
   - Commit count: "47 commits"
   - Timestamp: "Created 2 hours ago"

4. **Empty states**:
   - No changelogs at all: "No changelogs yet. Generate your first one." + CTA button
   - Filter returns nothing: "No drafts found." (no CTA needed)

Cards should use subtle hover effects and click to navigate. Do NOT use a table layout — cards feel more modern and are easier to scan.

### 3.5 — Tags API endpoint

Create `src/app/api/projects/[id]/tags/route.ts`:

- `GET` — Returns recent tags for the project's repo
- Uses the helper from Phase 2 (2.2)
- Response: `{ data: TagInfo[] }`

This powers the "Since last release" smart default in the generate form.

### 3.6 — Keyboard shortcuts

Add global keyboard shortcuts to the dashboard:

- `Cmd/Ctrl + N` — Navigate to generate page
- `Cmd/Ctrl + Enter` — Submit the generate form (when on the generate page)
- `Cmd/Ctrl + Shift + P` — Publish the current changelog (when on the edit page)
- `Escape` — Close any open dialog

Use a simple event listener in the dashboard layout — no library needed.

## Design reference

The overall aesthetic should channel:
- **Linear**: Clean sidebar, monochrome palette, purposeful use of color only for status
- **Vercel Dashboard**: Crisp typography, generous whitespace, data-dense but not cluttered
- **Notion**: Inline editing, content-first layout, minimal chrome

Color palette (Tailwind):
- Primary actions: zinc-900 (dark button on light bg) / white (on dark bg)
- Category accents: green-500 (features), blue-500 (improvements), amber-500 (fixes), red-500 (breaking)
- Backgrounds: white / zinc-50 for cards on light, zinc-950 / zinc-900 on dark
- Borders: zinc-200 (light) / zinc-800 (dark)
- Text: zinc-900 primary, zinc-500 secondary, zinc-400 tertiary

## Acceptance criteria

- [ ] Developer can select a repo and date range with smart defaults
- [ ] "Since last release" auto-detects the last tag and pre-fills the date
- [ ] Clicking "Generate" streams entries in real time with status updates
- [ ] Entries appear with animation, grouped by category
- [ ] After generation, developer can navigate to the editor
- [ ] Editor allows inline editing of titles, descriptions, and version
- [ ] Entries can be deleted and manually added
- [ ] Entries can be moved between categories
- [ ] Autosave works (debounced PATCH)
- [ ] "Publish" button works and updates the status
- [ ] Changelog list shows all entries with filter tabs
- [ ] Keyboard shortcuts work
- [ ] All pages have proper loading skeletons and empty states
- [ ] The overall design feels clean, minimal, and polished
