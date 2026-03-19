# Phase 6 Test Plan

## 1. Markdown Export (Copy to Clipboard)
- [X] Open a changelog in the editor
- [X] Click "Copy" button → verify toast "Copied to clipboard"
- [X] Paste in a text editor → verify format: `# version — date`, `## Category` with emoji prefixes, bulleted entries
- [X] Click "Export" → verify .md file downloads with same content

## 2. Semantic Version Suggestion
- [X] Generate a changelog with features → version input should show "Suggested: vX.Y+1.0"
- [X] Manually add a breaking entry → suggestion should change to major bump
- [X] Click the suggestion → version field updates and triggers save
- [X] If version already matches suggestion, no suggestion shown

## 3. Breaking Change Detection
- [X] Generate from a repo with deleted files → verify breaking signals injected into classification
- [X] Generate from a repo with commits containing "BREAKING CHANGE" → verify breaking category populated
- [X] Generate from a repo with schema file changes → verify signals detected
- [X] Normal repo without breaking changes → no false positives

## 4. Tone Regeneration
- [X] Open an existing changelog → click "Tone" button → see dropdown with Technical/Product/Enterprise
- [X] Select "Product" → verify loading state, then entries update with product-style language
- [X] Select "Enterprise" → verify entries update with compliance-focused language
- [X] Verify content is saved to DB (refresh page, entries persist)
- [X] Changelog without classificationData → verify graceful error message

## 5. AI Chat Widget
- [X] Visit public changelog page → see gradient "Ask about changes" FAB
- [X] Click FAB → chat panel opens with empty state message
- [X] Type "What changed recently?" → verify streamed response appears
- [X] Send multiple messages → verify scroll-to-bottom works
- [X] Close chat → re-open → messages persist within session
- [X] Chat with no published changelogs → assistant says it doesn't know

## 6. Webhook Agent
- [X] `curl -X POST /api/webhook` with valid signature + tag create payload → verify 200 response with changelogId
- [X] Invalid signature → verify 401 response
- [X] Non-create event → verify skipped response
- [X] Tag create for unknown repo → verify skipped response
- [X] Verify changelog created with status "pending_review" and version matching tag
- [X] Dashboard: pending_review changelog shows "Auto-generated" purple badge + "Pending review" blue badge

## 7. Final Polish
- [X] `pnpm build` succeeds with no errors
- [X] `.env.example` includes GITHUB_WEBHOOK_SECRET
- [ ] Root layout has OpenGraph meta tags
- [X] Public changelog page has title/description metadata
- [X] No console errors on any page
- [ ] All pages responsive on mobile (375px width)
