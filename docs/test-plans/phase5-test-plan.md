# Phase 5: Dashboard Settings Page — Test Plan

## Prerequisites

1. Start the dev server: `pnpm dev`
2. Authenticate via GitHub OAuth
3. Have at least one connected repository (ideally two, for multi-project tests)
4. Have at least one changelog generated for a connected repo

---

## 1. Settings Page — Layout & Navigation

- [X] Sidebar "Settings" link navigates to `/settings`
- [X] Sidebar "Settings" item is highlighted when on `/settings`
- [X] Page header "Settings" renders in DM Sans 24px bold
- [X] All four sections render in order: Linked Account, Connected Repository, Default Generation Preferences, Danger Zone
- [X] Sections have `gap-8` vertical spacing
- [X] Unauthenticated access to `/settings` redirects to `/`

---

## 2. Linked Account Card

### Display
- [X] Section title "Linked Account" renders above the card
- [X] User avatar renders as 40px rounded-lg image (or gray placeholder if no image)
- [X] User name displays in 14px medium weight
- [X] User email displays in 13px secondary color
- [X] Green "Connected" badge with GitHub icon renders next to user info
- [X] OAuth note text renders at bottom of card in 12px `#6B6B6B`

### Sign out
- [X] "Sign out" button renders with border styling
- [X] Clicking "Sign out" calls `signOut()` and redirects to `/`
- [X] After sign out, visiting `/settings` redirects to `/` (landing page)

---

## 3. Connected Repository Card

### Display
- [X] Section title "Connected Repository" renders above the card
- [X] Each connected repo shows git-branch icon (green) + `owner/repo` name
- [X] "Connected" status text renders below each repo name
- [X] "Disconnect" button renders with red text and border styling
- [ ] Empty state "No repositories connected yet." renders when no projects exist

### Disconnect flow
- [X] Clicking "Disconnect" opens a confirmation dialog
- [X] Dialog shows the repo name being disconnected
- [X] Dialog has "Cancel" and "Disconnect" buttons
- [X] Clicking "Cancel" closes the dialog without action
- [X] Clicking "Disconnect" sends `DELETE /api/projects/:id`
- [X] After successful disconnect, the repo disappears from the list (page refreshes)
- [X] Disconnecting a repo also deletes its associated changelogs (Prisma cascade)
- [X] Button shows "Disconnecting..." while request is in flight

---

## 4. Default Generation Preferences Card

### Display
- [X] Section title "Default Generation Preferences" renders above the card
- [X] Description text about defaults renders in 13px `#6B6B6B`
- [X] "Default tone" label and Select dropdown render
- [X] "Default date range" label and Select dropdown render
- [X] "Save defaults" button has green-to-blue gradient with glow shadow

### Select dropdowns
- [X] Default tone dropdown has options: Technical, Product, Enterprise
- [X] Default date range dropdown has options: Since last release, Last 7 days, Last 14 days, Last 30 days
- [X] Dropdowns initialize with saved preferences (or "Technical" / "Since last release" if none saved)
- [X] Changing a dropdown updates the local state (no save until button clicked)

### Save flow
- [X] Clicking "Save defaults" sends `PUT /api/settings/preferences` with selected values
- [X] Success toast "Preferences saved" appears via Sonner
- [X] Button shows "Saving..." while request is in flight
- [X] Reloading `/settings` shows the previously saved values
- [X] Saving with invalid data (API-level) shows error toast

---

## 5. Danger Zone Card

### Display
- [X] Section title "Danger Zone" renders in red text
- [X] Card has red-tinted background (`bg-red-50` light / `bg-red-950/20` dark)
- [X] Card has red border
- [X] Each project has "Delete this project" label with description text
- [X] Red "Delete project" button with trash icon renders per project
- [X] Empty state "No projects to delete." renders when no projects exist

### Delete flow
- [X] Clicking "Delete project" opens a confirmation dialog
- [X] Dialog instructs user to type `owner/repo` to confirm
- [X] Text input has placeholder matching the expected confirmation text
- [X] "Delete project" button in dialog is disabled until text matches exactly
- [X] Typing the wrong text keeps button disabled
- [X] Typing the correct `owner/repo` enables the button
- [X] Clicking "Delete project" sends `DELETE /api/projects/:id`
- [X] After successful delete, user is redirected to `/changelogs`
- [X] Button shows "Deleting..." while request is in flight
- [X] Clicking "Cancel" closes dialog and clears the input
- [X] Re-opening dialog for same project starts with empty input

---

## 6. Generate Form — Preferences Pre-fill

- [X] Navigate to `/changelogs/new` after saving preferences
- [X] Tone selector pre-selects the saved default tone (e.g., "Product")
- [X] Date range pre-selects the saved default date range (e.g., "Last 7 days")
- [X] If no preferences saved, defaults remain "Technical" and "Since last release"
- [X] User can still override pre-filled values before generating
- [X] Overriding a value does not modify saved preferences

---

## 7. API Routes

### `GET /api/settings/preferences`
- [X] Returns saved preferences for authenticated user
- [X] Returns defaults (`technical`, `last-release`) if no preferences exist
- [X] Returns 401 for unauthenticated requests

### `PUT /api/settings/preferences`
- [X] Creates preferences if none exist (upsert)
- [X] Updates preferences if they already exist
- [X] Returns 400 for invalid tone or date range values
- [X] Returns 401 for unauthenticated requests

### `DELETE /api/projects/[id]`
- [X] Deletes the project and cascades to changelogs
- [X] Returns 204 on success
- [X] Returns 404 if project doesn't exist or belongs to another user
- [X] Returns 401 for unauthenticated requests
- [X] Cannot delete another user's project (ownership check)

---

## 8. Theme Support

- [X] All settings cards adapt to dark/light theme
- [X] Danger Zone red tint adapts (`bg-red-50` light / `bg-red-950/20` dark)
- [X] Select dropdowns render correctly in both themes
- [X] Dialog overlays render correctly in both themes
- [X] Gradient button appears consistent across themes

---

## 9. Edge Cases

- [X] **No connected repos**: Connected Repository card shows empty state, Danger Zone shows empty state
- [X] **Single project deleted**: Settings page re-renders with updated list
- [X] **All projects deleted**: Both Connected Repository and Danger Zone show empty states
- [X] **Rapid save clicks**: Only one request fires (button disabled during save)
- [X] **Network failure on save**: Error toast appears, form state preserved
- [X] **Network failure on delete**: Dialog stays open, button re-enables
- [X] **Browser back after delete redirect**: `/changelogs` loads normally
- [X] **Concurrent tab**: Preferences saved in one tab reflect on reload in another
