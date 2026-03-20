# Improvements Test Plan

Post-launch performance, resilience, and polish fixes.

## 1. N+1 Fix — Concurrent Commit Fetching

- [X] Sign in and connect a repository with 20+ commits
- [X] Generate changelog → select repo → "Last 30 days" → Generate
- [X] Open DevTools Network tab → confirm commit detail requests fire in parallel batches (not sequentially)
- [X] Merge commits and noise commits (e.g. "Merge branch …", "bump …") should not trigger detail fetches
- [X] Repos with >100 commits should paginate and cap at 100

## 2. N+1 Fix — Concurrent Tag Fetching

- [X] Select a repo with multiple tags → confirm "Since last release" resolves quickly
- [X] DevTools Network tab → tag date lookups should fire concurrently
- [X] Repos with only lightweight tags (no annotated tags) should still resolve dates via commit fallback

## 3. Commit Data Storage

- [X] Generate a changelog from a real repo
- [X] Open Prisma Studio (`DATABASE_URL="file:./dev.db" pnpm prisma studio`)
- [X] Find the changelog entry → confirm `commitData` field contains `[{sha, message}, ...]` JSON
- [X] The `commitData` array length should match the commit count shown in the editor

## 4. Regeneration with Stored Commits

- [X] Open a draft changelog that was generated after this update (has `commitData`)
- [X] Click regenerate icon → pick a different tone (e.g. "Product")
- [X] Verify regenerated entries contain descriptions derived from actual commit messages
- [X] Compare with regenerating an older changelog (no `commitData`) → should still work but with less detail

## 5. Autosave Flush on Unmount

- [X] Open a draft changelog in the editor
- [X] Change an entry title or description
- [X] Immediately navigate away (back button or sidebar link) — do not wait for "Saved" indicator
- [X] Navigate back to the same changelog
- [X] Verify the edit persisted

## 6. SSE Stream Parse Resilience

- [X] Generate a new changelog → confirm streaming UI works normally (status → entries → completion)
- [X] No console errors during normal streaming
- [X] (Optional) Temporarily inject a malformed SSE line in the generate route → confirm UI logs a warning but does not crash

## 7. Chat Token Budget

- [X] Publish 4+ changelogs with substantial content
- [X] Go to the Chat page → ask "What changed recently?"
- [X] Verify response is coherent and does not error from context overflow
- [X] With many published changelogs, older ones should be omitted (30K char budget)

## 8. Category Order and Colors — Public Feed

- [X] Ensure at least one published changelog has entries in multiple categories
- [X] Visit the public feed page
- [X] Verify category order: **New Features → Improvements → Bug Fixes → Breaking Changes**
- [X] Verify category background colors are visibly tinted (8% opacity — should be noticeable, not invisible)

## 9. Category Order and Colors — Editor

- [X] Open a changelog in the editor with multiple categories
- [X] Verify same order: features → improvements → fixes → breaking
- [X] Verify count badges and entry card backgrounds match the updated colors

## 10. Shared `parseContent` (Refactor — No Behavior Change)

- [X] Editor loads and displays saved changelog content correctly
- [X] Public feed renders published changelogs correctly
- [X] No regressions in either view

## 11. Build Verification

- [X] `pnpm build` completes with zero errors
- [X] No new TypeScript warnings introduced

---

## Smoke Test Checklist

| # | Test | Pass? |
|---|------|-------|
| 1 | Generate changelog from real repo (parallel fetching) | |
| 2 | Tag detection works (parallel lookups) | |
| 3 | `commitData` populated in DB | |
| 4 | Regenerate with different tone → commit-aware output | |
| 5 | Edit + immediate navigate away → edit persists | |
| 6 | Streaming UI works end-to-end | |
| 7 | Chat works with multiple published changelogs | |
| 8 | Public feed: correct category order + visible tints | |
| 9 | Editor: correct category order + visible tints | |
| 10 | `pnpm build` clean | |
