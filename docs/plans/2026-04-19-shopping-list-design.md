# Shopping List App — Design Document

**Date:** 2026-04-19
**Status:** Approved, ready for implementation planning

## Overview

A low-friction web app for shared family/group shopping lists. Users log in with Google or passwordless email, create households, and invite others by link. Each household has one active list that is edited collaboratively in real time; once shopping is done, the list is "closed" and archived to history, and a new empty list begins.

## Goals & Non-Goals

**Goals:**
- Zero-password entry (Google or email magic link)
- Real-time collaboration without polling or custom backend
- One active list per household with editable title and full history
- Per-user color attribution on items (2–8 members per household)
- Run entirely on free tiers (Vercel Hobby + Firebase Spark)
- Schema prepared for future monetization without refactor

**Non-goals (MVP):**
- Native mobile apps
- Offline-first beyond Firestore's built-in cache
- Recurring items, templates, budget tracking, barcode scanner
- Stripe / paid features (schema ready, logic deferred)

## Architecture

- **Frontend/Hosting:** Next.js App Router (TypeScript) deployed on Vercel Hobby
- **Auth:** Firebase Auth — Google + Email Magic Link
- **Data + Realtime:** Firestore (native `onSnapshot` subscriptions, no WebSocket server)
- **Styling:** Tailwind CSS v4 + shadcn/ui + lucide-react
- **PWA:** Manifest + icons for "add to home screen"

No custom backend. Writes go from the browser directly to Firestore, protected by Security Rules.

## Data Model (Firestore)

```
users/{userId}
  ├─ email, displayName, photoURL
  ├─ householdIds: string[]            # for dashboard query
  ├─ plan: "free"                      # future: "pro"
  └─ planExpiresAt?: timestamp

households/{householdId}
  ├─ name
  ├─ createdBy: userId
  ├─ memberIds: userId[]               # denormalized for queries
  ├─ inviteCode: string                # rotatable secret, 6-8 chars
  ├─ activeListId: listId
  └─ createdAt

  /members/{userId}
    ├─ displayName                     # overridable per-household
    ├─ color                           # from 8-color pool
    ├─ role: "owner" | "member"
    └─ joinedAt

  /lists/{listId}
    ├─ title                           # editable; default "Compras de {date}"
    ├─ status: "active" | "closed"
    ├─ createdAt
    └─ closedAt?

    /items/{itemId}
      ├─ name, quantity
      ├─ addedBy (userId)
      ├─ addedByName                   # denormalized at write
      ├─ addedByColor                  # denormalized at write
      ├─ checked: boolean
      ├─ checkedBy?: userId
      └─ createdAt
```

**Denormalization rationale:** `addedByName` and `addedByColor` are written onto each item so that rendering never requires a join to `members/`. Members renaming themselves does not retroactively update old items (acceptable; a Cloud Function would be needed and is outside the free tier).

**Color pool:** red, blue, green, yellow, purple, orange, cyan, pink. Assigned in order of joining; wraps if exceeded.

## Core Flows

### 1. First use
- Landing → "Sign in with Google" or "Sign in with email link"
- On auth callback → create `users/{uid}` if missing → redirect to `/dashboard`

### 2. Dashboard (`/dashboard`)
- Query `households` where `memberIds` array-contains current uid
- Each card: household name, active list title, item count, member avatars
- Actions: "Create household" / "Join with code"

### 3. Household view (`/h/[id]`)
- Subscribes to active list and its items via `onSnapshot`
- Add item: name + optional quantity → writes to `items/`
- Check / uncheck item: toggles `checked`, records `checkedBy`
- Delete item: only author or owner
- "Close list" button → confirmation dialog → atomic transaction:
  - Set `lists/{activeId}.status = "closed"`, `closedAt = serverTimestamp()`
  - Create new `lists/{newId}` with `status = "active"`
  - Update `households/{id}.activeListId = newId`
- History tab → lists where `status == "closed"`, ordered by `closedAt desc`

### 4. Invite (`/join/[inviteCode]`)
- Unauthenticated → redirect through auth → back to join URL
- Authenticated → look up household by `inviteCode` → add uid to `memberIds`, create `members/{uid}` with next free color → redirect to `/h/{id}`

### 5. Administrative actions
- Leave household (any member): removes self from `memberIds`
- Rotate invite code (owner): regenerates `inviteCode`
- Remove member (owner): removes from `memberIds`
- Delete household (owner, double-confirm): deletes household + subcollections

## Security Rules

Enforced server-side by Firestore Rules:

- Read/write `households/{id}` and subcollections: only if `request.auth.uid in resource.data.memberIds`
- Joining: a user may append **only their own UID** to `memberIds`, and only when `inviteCode` in the request matches
- Item writes: `addedBy == request.auth.uid` and `createdAt == request.time`
- Field validation:
  - `item.name`: 1–80 chars
  - `item.quantity`: 0–20 chars
  - `item.checked`: boolean
  - `household.memberIds.size() <= 20`
  - `list.items` count via client query-level check + rule precondition
- Per-plan limits (all users on "free" in MVP):
  - Max 3 households per user (`users/{uid}.householdIds.size() <= 3`)
  - Max 200 items per active list
  - Max 20 members per household
- Rate-limit implicit: client debounces + rule requires `createdAt == request.time`

## Scalability Notes

Back-of-envelope for Firebase Spark free tier (50k reads / 20k writes daily, 50k concurrent realtime):

- ~50–100 ops/household/day → ~500 active households free
- Beyond that → Blaze pay-as-you-go: ~$0.06 per 100k reads (tens of cents/month for hundreds of families)
- Realtime connections are not a bottleneck at any plausible scale

Alerts at 80% daily quota in Firebase Console; upgrade path is one click.

## Monetization (future, schema-ready only)

Field `plan` on `users/{uid}` defaults to `"free"`. Security Rules read this field for limits. Activating "pro" later requires:
1. Stripe Checkout + webhook
2. Cloud Function on webhook → set `plan = "pro"` and `planExpiresAt`
3. Rules relax limits when `plan == "pro" && planExpiresAt > now`

No refactor to application code.

## UI Structure

Routes:
- `/` — landing / sign-in
- `/dashboard` — household cards
- `/h/[id]` — active list + history tab
- `/h/[id]/lists/[listId]` — read-only view of closed list
- `/join/[inviteCode]` — join handler
- `/settings` — edit global displayName; plan info

Key components:
- `AddItemInput`, `ItemRow`, `MemberAvatars`, `HouseholdCard`, `CloseListDialog`, `InviteDialog`

## Testing Strategy (TDD)

**Unit (Vitest):**
- Color assignment picks first free color from pool, wraps after 8
- Item validation (name non-empty, quantity length cap)
- `inviteCode` generator returns unique 6–8 char strings
- Close-list transaction: atomic transition to new active list

**Firestore Rules (`@firebase/rules-unit-testing` + emulator):**
- Non-member cannot read/write household docs
- Join only appends own UID, only with correct `inviteCode`
- Member/item/household size limits enforced
- `addedBy` spoofing rejected
- Owner-only operations (remove member, rotate code, delete household) rejected for non-owners

**E2E (Playwright):**
- Full flow: login → create household → add item → second browser as second user → item appears in realtime
- Close list → history preserves items → new active list is empty
- Join via invite link → appears in invitee's dashboard
- Leave household → disappears from dashboard

**Edge cases:**
- Rapid "add" clicks do not duplicate; debounce + rules enforce rate
- Offline → Firestore cache shows stale state, syncs on reconnect
- Two users check same item → last-write-wins, acceptable
- Invalid invite code → clear error, no state change

## Open Questions (defer to implementation)

- PWA icon set (design task later)
- Landing page copy & visuals
- Error boundary / toast system choice (likely shadcn `sonner`)

## Next Steps

1. Commit this design to git
2. Invoke `writing-plans` skill to produce a step-by-step implementation plan
3. Begin implementation on a feature branch following TDD
