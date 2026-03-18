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

**Layout during streaming** (see design screen 04):

1. **Status bar** at the top
   - Green dot indicator + status text in JetBrains Mono: "Writing changelog entries..."
   - Once complete: "Generated 8 entries from 47 commits" in DM Sans 600

2. **Entries appearing in real time**
   - As `entry` events arrive, new changelog entry cards animate in (fade + slide up, 200ms)
   - Entries are grouped by category with category headers
   - Category headers: 3px colored accent bar (vertical) + category label in bold
   - Category order: New Features → Bug Fixes (Breaking Changes → Improvements as applicable)
   - Each entry is a bordered card with title + description, subtle `$bg-page` fill
   - Entry cards use 1px `$border` stroke with `rounded-lg`

3. **After stream completes**
   - "Edit & Review" primary button (green with glow, pencil icon) + "Generate again" secondary outlined button
   - Both buttons appear in a horizontal row

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

**Layout** (see design screen 05, full-width content area):

1. **Header bar** (horizontal, space-between)
   - Left side: editable title in DM Sans 700 22px + status badge ("Draft" amber pill or "Published" green pill)
   - Below title: metadata in JetBrains Mono 11px: "47 commits · Mar 10 – Mar 17, 2026 · acme/web-app"
   - Right side: "✓ Saved" indicator (green check + text), "Export" outlined button, "Publish" green primary button with glow
   - Separated from content by a subtle `$border-muted` horizontal rule

2. **Category sections**
   - Each category has: 3px colored accent bar + category name (15px medium) + count badge (pill with number) + right-aligned "+ Add entry" link
   - Colors: Features = `#10B981` green, Fixes = `#F59E0B` amber, Improvements = `#3B82F6` blue, Breaking = `#EF4444` red

3. **Entry cards** (within each category)
   - Each entry is a bordered card with a colored left border (3px, matching category)
   - Card has `rounded-lg`, 1px `$border` stroke, clipped to show the left accent bar
   - Title: editable text (14px medium)
   - Description: editable text (13px, secondary color, 1.5 line-height)
   - Actions on each card (shown on hover): "Delete", "Move to..." (dropdown to change category)

4. **Add entry**
   - "+ Add entry" text link at the right side of each category header
   - Opens an inline form to type a manual entry

5. **Toast notification** (see design screen 11)
   - On publish, show a success toast in the bottom-right: green check icon in a pill, "Changelog published" title, "Release v2.3.0 is now live on your public page." description, dismiss X button
   - Toast has `$bg-surface` background, border, and drop shadow

**API routes for editing**:

`PATCH /api/changelogs/[id]` — Updates title, content, rawContent, version
`POST /api/changelogs/[id]/publish` — Sets status to "published" and publishedAt to now

**Autosave**: Debounce edits and auto-save via PATCH every 3 seconds after the last edit. Show a subtle "Saving..." / "Saved" indicator in the header.

### 3.4 — Changelog list page (dashboard home)

Update `src/app/(dashboard)/page.tsx`:

The main dashboard view showing all changelogs.

**Layout** (see design screens 02 and 08):

1. **Page header**: "Changelogs" in DM Sans 700 + "Generate new" green button with plus icon (top right)

2. **Filter tabs**: "All" (active, `$bg-surface` background), "Drafts", "Published" — pill-shaped text tabs in a horizontal row

3. **Changelog cards** in a vertical list (12px gap):
   - Each card: 1px `$border` stroke, `rounded-lg`, 16px padding
   - Top row (space-between): Title (15px medium) on left, status badge on right
   - Status badges: "Published" (green-bg pill), "Draft" (amber-bg pill), "Pending review" (blue-bg pill)
   - Bottom row: metadata in JetBrains Mono 11px — `owner/repo · date range · commit count`, separated by dots
   - First card has subtle green glow hover effect to signal interactivity

4. **Empty states** (see design screen 08):
   - Centered vertically: file icon in a 56px bordered container, "No changelogs yet" heading in DM Sans 600, descriptive paragraph, green "Connect repository" CTA button with GitHub icon and glow, plus "or generate from a public repo" link
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

Refer to `docs/design/chamelelog-design.pen` for all finalized screens. The design is Greptile-inspired with a chameleon branding motif.

**Aesthetic**: Dark-first, developer-tool feel inspired by Linear, Vercel, and Greptile. Clean sidebar with depth separation, emerald green accent (`#10B981`), gradient logo and CTA elements.

**Typography** (three-font system):
- **DM Sans** (700-800): Page titles, brand name, section headers — tight letter-spacing for display impact
- **JetBrains Mono** (11px): Repo names, date ranges, commit counts, version badges — technical metadata
- **Inter** (12-14px): Body text, nav items, descriptions, buttons — functional UI

**Color palette** — see Phase 1 section 1.4 for full dark/light mode values. Key points:
- Primary accent: `#10B981` emerald green with `#10B98130` glow shadow on CTA buttons
- Category colors: green (features), blue (improvements), amber (fixes), red (breaking)
- Category card backgrounds: very subtle tinted fills (e.g. `#10B98108` for features)
- Dark sidebar: `#070707` (darker than page `#0A0A0A`) for depth
- Green-to-blue gradient (`#10B981` → `#3B82F6`, 135°) on: logo icon, chat FAB, hero "changelogs" text

**Interactive patterns**:
- First card in list has subtle green glow on hover to show interactivity
- Green glow shadow on all primary action buttons
- Toast notifications in bottom-right for feedback (see screen 11)

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
- [ ] Toast notification appears on successful publish
- [ ] Changelog list shows all entries with filter tabs
- [ ] Keyboard shortcuts work
- [ ] All pages have proper loading skeletons and empty states
- [ ] The overall design feels clean, minimal, and polished
- [ ] **Design check**: Compare all frontend output against `docs/design/chamelelog-design.pen` (screens 02, 03, 04, 05, 08, 11). Verify: DM Sans titles, JetBrains Mono metadata, green accent buttons with glow, colored left-border entry cards, category-tinted backgrounds, dark sidebar depth, theme switcher, toast styling. The .pen file is the source of truth.
