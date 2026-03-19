# Phase 3 — Post-Testing Fixes

Captured from manual testing on 2026-03-19.

---

## Streaming Output (`/changelogs/new` — streaming phase)

- [x] **Scrollable entries area**: Entries push the page height and force scrolling to reach "Edit & Review" / "Generate again" buttons, and cut off the sidebar. Make the entries content area scrollable instead of extending the page.
- [x] **Editable entries during streaming**: Add an edit icon button on each entry card so users can manually edit entries before navigating to the full editor.

## Changelog Editor (`/changelogs/[id]`)

- [x] **Move save indicator to left of status badge**: "Saving..." / "Saved" check should appear to the left of the Draft/Published badge, not to the right.
- [x] **Fix Move dropdown overflow**: The "Move to..." dropdown menu opens inside the entry card, clipping the options so only the top-most one is visible. Needs to render above/outside the card (portal or z-index fix).
- [x] **Align Add/Cancel buttons bottom-right**: In the inline "Add entry" form, move the "Add" and "Cancel" buttons to the bottom-right of the form.
- [x] **Collapsible category sections**: Clicking a category heading (e.g. "New Features", "Improvements") should toggle expand/collapse of all entries in that section.

## Keyboard Shortcuts

- [ ] *(Low priority)* **Ctrl+N conflict on Windows/Chrome**: `Ctrl+N` opens a new browser window instead of navigating to `/changelogs/new`. Need an alternative shortcut or accept the browser override.
- [ ] *(Low priority)* **Other shortcuts not firing**: `Ctrl+Enter`, `Ctrl+Shift+P`, and `Escape` are not working. Investigate why the event listener isn't catching these.

## Edge Cases

- [x] **No commits in range — improve empty state**: When generation completes with 0 entries/0 commits, the UI shows "Generated 0 entries from 0 commits" with no actionable next step. Should show "No meaningful commits found within this range..." with a button to go back to the form.
- [ ] *(Low priority)* **Mobile viewport**: Layout is mostly broken on narrow viewports. Defer to a future pass.
