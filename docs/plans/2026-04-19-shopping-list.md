# Shopping List App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a real-time, multi-user shopping list web app where households are shared by link, items are color-coded per author, and closed lists are archived to history.

**Architecture:** Serverless Next.js frontend on Vercel talks directly to Firestore via the Firebase Web SDK. Realtime is native (`onSnapshot`); Security Rules enforce all server-side invariants. No custom backend.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui, lucide-react, Firebase Auth (Google + Email Link), Firestore, Vitest (unit), `@firebase/rules-unit-testing` + Firebase Emulator (rules), Playwright (E2E), pnpm.

**Source of truth for design:** `docs/plans/2026-04-19-shopping-list-design.md`.

---

## Branching Strategy

- Every phase uses a feature branch: `feature/phase-N-<slug>` branched from `main`.
- Merge back to `main` only after all tests pass and a re-read pass found no issues (see CLAUDE.md §3).
- Do not commit directly to `main`.

---

## Phase 0 — Project Scaffolding

Branch: `feature/phase-0-scaffold`

### Task 0.1: Initialize branch and Next.js app

**Files:** whole repo

**Step 1: Create branch**
```bash
git checkout -b feature/phase-0-scaffold
```

**Step 2: Scaffold Next.js**
```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```
Expected: Next.js files created. Confirm `package.json`, `src/app/`, `tsconfig.json` exist.

**Step 3: Verify it runs**
```bash
pnpm dev
```
Expected: Dev server on `http://localhost:3000`. Kill with Ctrl+C.

**Step 4: Commit**
```bash
git add -A
git commit -m "chore: scaffold Next.js app with TS + Tailwind"
```

### Task 0.2: Install core dependencies

**Files:** `package.json`

**Step 1: Add deps**
```bash
pnpm add firebase
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @firebase/rules-unit-testing firebase-tools
pnpm add -D @playwright/test
pnpm add lucide-react clsx tailwind-merge class-variance-authority
```

**Step 2: Initialize shadcn/ui**
```bash
pnpm dlx shadcn@latest init
```
Accept defaults (New York style, neutral base, CSS vars, RSC).

**Step 3: Add first components we will need**
```bash
pnpm dlx shadcn@latest add button input dialog sonner avatar tabs dropdown-menu card label
```

**Step 4: Commit**
```bash
git add -A
git commit -m "chore: install deps and init shadcn/ui"
```

### Task 0.3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add scripts)

**Step 1: Create `vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    exclude: ["node_modules", "tests/e2e/**"],
  },
});
```

Install the plugin:
```bash
pnpm add -D vite-tsconfig-paths
```

**Step 2: Create `src/test/setup.ts`**
```ts
import "@testing-library/jest-dom/vitest";
```

**Step 3: Add scripts to `package.json`**
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:rules": "vitest run --config vitest.rules.config.ts",
  "test:e2e": "playwright test",
  "emulator": "firebase emulators:start --only auth,firestore"
}
```

**Step 4: Smoke test** — write `src/test/setup.smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest works", () => expect(1 + 1).toBe(2));
```

Run:
```bash
pnpm test
```
Expected: 1 passed.

**Step 5: Commit**
```bash
git add -A
git commit -m "test: configure Vitest with jsdom"
```

### Task 0.4: Configure Playwright

**Step 1: Init**
```bash
pnpm dlx playwright install --with-deps chromium
```

**Step 2: Create `playwright.config.ts`**
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

**Step 3: Smoke E2E** — `tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
test("loads home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
```

**Step 4: Verify**
```bash
pnpm test:e2e
```
Expected: 1 passed (tolerate Next's default page title).

**Step 5: Commit**
```bash
git add -A
git commit -m "test: configure Playwright with dev-server auto-start"
```

### Task 0.5: Configure Firebase emulators

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules` (placeholder)
- Create: `firestore.indexes.json`

**Step 1: Write `firebase.json`**
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

**Step 2: Write `.firebaserc`**
```json
{ "projects": { "default": "shopinglist-dev" } }
```

**Step 3: Write placeholder `firestore.rules`**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

**Step 4: Write `firestore.indexes.json`**
```json
{ "indexes": [], "fieldOverrides": [] }
```

**Step 5: Start emulators manually once to verify**
```bash
pnpm emulator
```
Expected: emulator UI on `http://localhost:4000`. Kill with Ctrl+C.

**Step 6: Commit**
```bash
git add -A
git commit -m "chore: configure Firebase emulators (auth + firestore)"
```

### Task 0.6: Merge Phase 0

**Step 1:** Run `pnpm test && pnpm test:e2e`. All pass.
**Step 2:** Re-read each changed file.
**Step 3:** Merge.
```bash
git checkout main
git merge --no-ff feature/phase-0-scaffold -m "phase 0: scaffolding"
```

---

## Phase 1 — Firebase client + typed data layer

Branch: `feature/phase-1-firebase-client`

### Task 1.1: Environment variables

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (git-ignored, local-only)
- Modify: `.gitignore` (confirm `.env*.local` ignored)

**Step 1:** Add `.env.local.example` with Firebase vars (placeholders):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=shopinglist-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATORS=true
```

**Step 2:** Copy to `.env.local` and set `NEXT_PUBLIC_USE_EMULATORS=true` for local.

**Step 3:** Commit only the example.
```bash
git add .env.local.example .gitignore
git commit -m "chore: document required Firebase env vars"
```

### Task 1.2: Firebase client module (TDD)

**Files:**
- Create: `src/lib/firebase/client.ts`
- Create: `src/lib/firebase/client.test.ts`

**Step 1: Write failing test** `src/lib/firebase/client.test.ts`:
```ts
import { describe, expect, it, beforeEach, vi } from "vitest";

describe("firebase client", () => {
  beforeEach(() => vi.resetModules());

  it("initializes a single app instance", async () => {
    const { getFirebaseApp } = await import("./client");
    const a = getFirebaseApp();
    const b = getFirebaseApp();
    expect(a).toBe(b);
  });

  it("exports auth and firestore bound to that app", async () => {
    const { getFirebaseApp, getDb, getAuthClient } = await import("./client");
    expect(getDb().app).toBe(getFirebaseApp());
    expect(getAuthClient().app).toBe(getFirebaseApp());
  });
});
```

**Step 2: Run — expect FAIL.**
```bash
pnpm test src/lib/firebase/client.test.ts
```

**Step 3: Implement** `src/lib/firebase/client.ts`:
```ts
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true" && typeof window !== "undefined") {
    try { connectFirestoreEmulator(db, "127.0.0.1", 8080); } catch { /* already connected */ }
  }
  return db;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true" && typeof window !== "undefined") {
    try { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); } catch { /* already */ }
  }
  return auth;
}
```

**Step 4: Run — expect PASS.**

**Step 5: Commit.**
```bash
git add -A
git commit -m "feat(firebase): single-instance client with emulator wiring"
```

### Task 1.3: Domain types

**Files:** Create: `src/lib/domain/types.ts`

**Step 1:** Define types matching the data model:
```ts
import type { Timestamp } from "firebase/firestore";

export type Plan = "free" | "pro";

export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  householdIds: string[];
  plan: Plan;
  planExpiresAt?: Timestamp | null;
  createdAt: Timestamp;
};

export type HouseholdDoc = {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  inviteCode: string;
  activeListId: string;
  createdAt: Timestamp;
};

export type MemberRole = "owner" | "member";

export type MemberDoc = {
  uid: string;
  displayName: string;
  color: string;
  role: MemberRole;
  joinedAt: Timestamp;
};

export type ListStatus = "active" | "closed";

export type ListDoc = {
  id: string;
  title: string;
  status: ListStatus;
  createdAt: Timestamp;
  closedAt?: Timestamp | null;
};

export type ItemDoc = {
  id: string;
  name: string;
  quantity: string;
  addedBy: string;
  addedByName: string;
  addedByColor: string;
  checked: boolean;
  checkedBy?: string | null;
  createdAt: Timestamp;
};

export const COLOR_POOL = [
  "#ef4444", "#3b82f6", "#22c55e", "#eab308",
  "#a855f7", "#f97316", "#06b6d4", "#ec4899",
] as const;

export type Color = (typeof COLOR_POOL)[number];
```

**Step 2: Commit.**
```bash
git add -A
git commit -m "feat(domain): add typed Firestore document models"
```

### Task 1.4: Pure helpers (TDD)

**Files:**
- Create: `src/lib/domain/helpers.ts`
- Create: `src/lib/domain/helpers.test.ts`

**Step 1: Write failing tests**:
```ts
import { describe, expect, it } from "vitest";
import {
  generateInviteCode,
  pickNextColor,
  validateItemName,
  validateQuantity,
  defaultListTitle,
} from "./helpers";
import { COLOR_POOL } from "./types";

describe("generateInviteCode", () => {
  it("returns 6-8 chars, alphanumeric lowercase", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[a-z0-9]{6,8}$/);
  });
  it("is different across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, generateInviteCode));
    expect(codes.size).toBe(50);
  });
});

describe("pickNextColor", () => {
  it("picks first unused color from pool", () => {
    expect(pickNextColor([])).toBe(COLOR_POOL[0]);
    expect(pickNextColor([COLOR_POOL[0]])).toBe(COLOR_POOL[1]);
    expect(pickNextColor(COLOR_POOL.slice(0, 3))).toBe(COLOR_POOL[3]);
  });
  it("wraps when all colors taken", () => {
    expect(pickNextColor([...COLOR_POOL])).toBe(COLOR_POOL[0]);
  });
});

describe("validateItemName", () => {
  it("rejects empty / whitespace", () => {
    expect(validateItemName("")).toBe(false);
    expect(validateItemName("   ")).toBe(false);
  });
  it("rejects > 80 chars", () => {
    expect(validateItemName("a".repeat(81))).toBe(false);
  });
  it("accepts 1-80 chars", () => {
    expect(validateItemName("leite")).toBe(true);
    expect(validateItemName("a".repeat(80))).toBe(true);
  });
});

describe("validateQuantity", () => {
  it("accepts empty (optional)", () => expect(validateQuantity("")).toBe(true));
  it("rejects > 20 chars", () => expect(validateQuantity("a".repeat(21))).toBe(false));
});

describe("defaultListTitle", () => {
  it("formats as 'Compras de YYYY-MM-DD'", () => {
    const d = new Date("2026-04-19T10:00:00Z");
    expect(defaultListTitle(d)).toBe("Compras de 2026-04-19");
  });
});
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement** `src/lib/domain/helpers.ts`:
```ts
import { COLOR_POOL, type Color } from "./types";

export function generateInviteCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = 6 + Math.floor(Math.random() * 3); // 6-8
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function pickNextColor(taken: readonly string[]): Color {
  for (const c of COLOR_POOL) {
    if (!taken.includes(c)) return c;
  }
  return COLOR_POOL[taken.length % COLOR_POOL.length];
}

export function validateItemName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 80;
}

export function validateQuantity(q: string): boolean {
  return q.length <= 20;
}

export function defaultListTitle(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `Compras de ${y}-${m}-${d}`;
}
```

**Step 4: Run — expect PASS.**

**Step 5: Commit.**
```bash
git add -A
git commit -m "feat(domain): pure helpers for invite codes, colors, validation"
```

### Task 1.5: Merge Phase 1
All tests pass → re-read → merge into `main` with `--no-ff`.

---

## Phase 2 — Auth

Branch: `feature/phase-2-auth`

### Task 2.1: Auth context + provider

**Files:**
- Create: `src/lib/auth/context.tsx`
- Create: `src/lib/auth/context.test.tsx`

**Step 1: Write failing test** that mounts the provider, simulates Firebase `onAuthStateChanged` emitting a user, and asserts `useAuth()` returns that user.

```tsx
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/auth", () => {
  let cb: ((u: unknown) => void) | null = null;
  return {
    onAuthStateChanged: (_a: unknown, c: (u: unknown) => void) => {
      cb = c;
      return () => { cb = null; };
    },
    __emit: (u: unknown) => cb?.(u),
  };
});
vi.mock("@/lib/firebase/client", () => ({ getAuthClient: () => ({}) }));

import { AuthProvider, useAuth } from "./context";

function Probe() {
  const { user, loading } = useAuth();
  return <div data-testid="out">{loading ? "L" : user ? user.uid : "anon"}</div>;
}

describe("AuthProvider", () => {
  it("transitions loading → user", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("out").textContent).toBe("L");
    const { __emit } = await import("firebase/auth") as unknown as { __emit: (u: unknown) => void };
    act(() => __emit({ uid: "u1", email: "a@b.c", displayName: "A", photoURL: null }));
    expect(screen.getByTestId("out").textContent).toBe("u1");
  });
});
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement** the provider:
```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";

type AuthState = { user: User | null; loading: boolean };
const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), (user) => setState({ user, loading: false }));
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
```

**Step 4: Run — expect PASS. Commit.**

### Task 2.2: Wire `AuthProvider` into root layout

**Files:** Modify `src/app/layout.tsx`.

Wrap `{children}` in `<AuthProvider>`. Also mount `<Toaster />` from `@/components/ui/sonner`.

Commit: `feat(auth): mount AuthProvider and Sonner toaster in root layout`.

### Task 2.3: Sign-in page (Google + email link)

**Files:**
- Create: `src/app/page.tsx` (landing)
- Create: `src/app/signin/page.tsx`
- Create: `src/app/signin/complete/page.tsx` (handles email-link callback)
- Create: `src/lib/auth/sign-in.ts`

**Step 1: Implement `src/lib/auth/sign-in.ts`** with:
- `signInWithGoogle()` — uses `signInWithPopup(GoogleAuthProvider)`
- `sendMagicLink(email)` — calls `sendSignInLinkToEmail` with continue URL `/signin/complete`, stores email in `localStorage`
- `completeEmailSignIn()` — reads email from `localStorage`, calls `signInWithEmailLink`

**Step 2: Write unit tests** for `sendMagicLink` mocking `firebase/auth`:
- Stores email in localStorage under a stable key (`shoppinglist:pending-email`)
- Uses URL `window.location.origin + "/signin/complete"`

**Step 3: Implement sign-in page UI** — two buttons (Google / send email link), email input, submit via toast feedback.

**Step 4: Implement complete page** — on mount calls `completeEmailSignIn()`, redirects to `/dashboard`, toasts errors.

**Step 5: Modify `src/app/page.tsx`** — if `useAuth().user` → `redirect("/dashboard")`; else → sign-in CTA.

**Step 6: Manual smoke** with emulator running (`pnpm emulator` in one terminal, `pnpm dev` in another): Google sign-in + email link both authenticate you (emulator shows magic link URL in its UI).

**Step 7: Commit** (one commit per file group — `auth: sign-in flows`, `auth: sign-in pages`).

### Task 2.4: Ensure `users/{uid}` doc on first sign-in

**Files:**
- Create: `src/lib/auth/ensure-user-doc.ts`
- Create: `src/lib/auth/ensure-user-doc.test.ts`

**Step 1: Failing test** (rules-unit-testing emulator, see Phase 5 setup — but you can stub Firestore here with fake-indexeddb or simpler by using `setDoc` mocks). Simpler: integration-style test against the **Firestore emulator**.

Create a reusable helper `src/test/firestore-emu.ts`:
```ts
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

export function getEmuDb(projectId = `t-${Date.now()}`) {
  const app = getApps().find(a => a.options.projectId === projectId)
    ?? initializeApp({ projectId }, projectId);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}
```

Test `ensureUserDoc`:
- Calling once creates a doc with `householdIds=[]`, `plan="free"`, `createdAt` set
- Calling twice does not overwrite (uses `setDoc` with `merge: true` but keeps `createdAt` intact)

**Step 2: Implement** `ensureUserDoc({ uid, email, displayName, photoURL })`:
- Reads `users/{uid}`; if missing, writes initial doc; if present, updates `email/displayName/photoURL` only.

**Step 3: Hook into `AuthProvider`**: when `user` transitions from null → set, call `ensureUserDoc(user)` exactly once.

**Step 4: Commit.**

### Task 2.5: Merge Phase 2

---

## Phase 3 — Household creation + dashboard

Branch: `feature/phase-3-households`

### Task 3.1: Firestore write wrappers (TDD, emulator-backed)

**Files:**
- Create: `src/lib/data/households.ts`
- Create: `src/lib/data/households.test.ts`

**Step 1: Failing tests** against emulator using `getEmuDb()`:
- `createHousehold({ db, owner, name })` returns a `householdId`, creates:
  - `households/{id}` with `memberIds=[owner.uid]`, `createdBy=owner.uid`, `inviteCode` set, `activeListId` set
  - `households/{id}/members/{owner.uid}` with `role="owner"`, color = first pool color
  - `households/{id}/lists/{activeListId}` with `status="active"`, `title="Compras de YYYY-MM-DD"`
  - Appends `id` to `users/{owner.uid}.householdIds`
- Runs atomically: a simulated partial failure leaves no orphans (use a `runTransaction` or `writeBatch`).

**Step 2: Implement** using `writeBatch` for the 4 writes. Generate IDs client-side with `doc(collection(db, "...")).id` so you can reference them before committing.

**Step 3: Commit.**

### Task 3.2: Dashboard query hook

**Files:**
- Create: `src/lib/data/use-households.ts`
- Create: `src/lib/data/use-households.test.tsx`

**Step 1:** Hook `useHouseholds()` subscribes to `households` where `memberIds` array-contains current uid, returns `{ households, loading }`.

**Step 2: Test** with emulator + React Testing Library:
- Seed two households (one with current uid, one without)
- Assert hook only returns the one containing the uid

**Step 3: Implement**, **commit**.

### Task 3.3: Dashboard page UI

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/household-card.tsx`
- Create: `src/components/create-household-dialog.tsx`
- Create: `src/components/join-household-dialog.tsx`

**Step 1:** Page shows a grid of `HouseholdCard`s from `useHouseholds()`.
- Empty state with CTA "Criar lista partilhada".
- Top bar: user avatar + displayName + sign-out + create + join buttons.

**Step 2:** `CreateHouseholdDialog`: input for name; on submit calls `createHousehold`, closes, toasts success with link to the new household.

**Step 3:** `JoinHouseholdDialog`: input for invite code; on submit navigates to `/join/{code}` (the page handles the rest — implemented in Phase 5).

**Step 4:** `HouseholdCard`: name, active list title + item count (subscribed), member avatars (initials, colored circles), click → `/h/{id}`.

**Step 5: Playwright E2E** `tests/e2e/dashboard.spec.ts`:
- Sign in (use emulator-backed Google sign-in helper)
- Click "Criar", type name, submit
- Assert card appears with that name

**Step 6: Commit each sub-feature separately.**

### Task 3.4: Merge Phase 3

---

## Phase 4 — Active list + items (realtime)

Branch: `feature/phase-4-items`

### Task 4.1: Item CRUD wrappers (TDD)

**Files:**
- Create: `src/lib/data/items.ts`
- Create: `src/lib/data/items.test.ts`

**Step 1: Failing tests** against emulator:
- `addItem({ householdId, listId, actor, name, quantity })` writes item with `addedBy/addedByName/addedByColor` denormalized from `members/{uid}`, `checked=false`, `createdAt=serverTimestamp()`
- Rejects `name=""` and `name.length>80` (client-side pre-check)
- `toggleItem({ ..., itemId })` flips `checked`; when setting true, sets `checkedBy = actor.uid`; when false, sets to `null`
- `deleteItem({ ..., itemId })` removes the doc

**Step 2: Implement. Commit.**

### Task 4.2: Realtime items hook

**Files:**
- Create: `src/lib/data/use-active-list.ts`
- Create: `src/lib/data/use-active-list.test.tsx`

Hook subscribes to the active list doc and its items subcollection (ordered by `createdAt`), returns `{ list, items, loading }`. Unsubscribes on unmount. Test asserts that a second client's write appears via subscription.

### Task 4.3: Household page UI

**Files:**
- Create: `src/app/h/[id]/page.tsx`
- Create: `src/components/add-item-input.tsx`
- Create: `src/components/item-row.tsx`
- Create: `src/components/member-avatars.tsx`

**Step 1:** Page subscribes via `useActiveList()`. Tabs: "Ativa" | "Histórico".

**Step 2:** `AddItemInput` — single row form; submit enabled only when `validateItemName(name) && validateQuantity(qty)`; debounces rapid submits (disable button 300ms).

**Step 3:** `ItemRow` — checkbox, name (struck-through when checked), quantity badge, color dot for author, delete button (only visible for author or owner). Click on item (not checkbox) toggles checked.

**Step 4:** Show member avatars in page header.

**Step 5: E2E** `tests/e2e/realtime.spec.ts`:
- Two browser contexts (same emulator, two users).
- User A adds "leite" → user B sees it within 3s.
- User B checks it → A sees the strikethrough.

**Step 6: Commit stepwise.**

### Task 4.4: Merge Phase 4

---

## Phase 5 — Invite + join

Branch: `feature/phase-5-invite`

### Task 5.1: Join flow (TDD)

**Files:**
- Create: `src/lib/data/join.ts`
- Create: `src/lib/data/join.test.ts`
- Create: `src/app/join/[code]/page.tsx`

**Step 1: Failing tests:**
- `findHouseholdByCode(db, code)` returns the household or null
- `joinHousehold({ db, code, user })`:
  - Adds `user.uid` to `memberIds`
  - Creates `members/{uid}` with next free color and role `"member"`
  - Appends id to `users/{uid}.householdIds`
  - Is idempotent: calling twice does not duplicate

**Step 2: Implement using transaction.** Commit.

**Step 3: Page** `src/app/join/[code]/page.tsx`:
- If `useAuth().loading` → spinner.
- If no user → redirect to `/signin?redirect=/join/{code}`.
- Else → call `joinHousehold`; on success `redirect(/h/{id})`; on failure (invalid code) show error with "Voltar ao dashboard".

**Step 4:** Update `signin/page.tsx` and `signin/complete/page.tsx` to honor `?redirect=` param.

### Task 5.2: Share dialog

**Files:**
- Create: `src/components/invite-dialog.tsx`

Shows link `https://{origin}/join/{inviteCode}`, copy-to-clipboard button, "Regenerar código" button (visible only for owner).

### Task 5.3: E2E

`tests/e2e/invite.spec.ts`:
- User A creates household, opens invite dialog, copies link.
- New context (User B) opens the link → signs in → lands on `/h/{id}` → appears in both users' dashboards.

### Task 5.4: Merge Phase 5

---

## Phase 6 — Close list + history

Branch: `feature/phase-6-history`

### Task 6.1: Close-list transaction (TDD)

**Files:**
- Create: `src/lib/data/close-list.ts`
- Create: `src/lib/data/close-list.test.ts`

**Step 1: Failing tests:**
- `closeActiveList({ db, householdId, actor })` runs in a transaction:
  - Sets current `activeListId` doc `status="closed"`, `closedAt=serverTimestamp()`
  - Creates a new list with `status="active"`, default title
  - Sets `households/{id}.activeListId` to the new list id
- History query returns the closed list with its items (items remain in subcollection)
- Atomicity: if the write batch fails, no partial state

**Step 2: Implement using `runTransaction`. Commit.**

### Task 6.2: History tab + list view

**Files:**
- Modify: `src/app/h/[id]/page.tsx` (history tab content)
- Create: `src/app/h/[id]/lists/[listId]/page.tsx` (read-only)

Tab lists closed lists ordered by `closedAt desc`: title, date, item count. Click → `/h/{id}/lists/{listId}` showing items read-only.

### Task 6.3: Close-list dialog

Confirm dialog: "Fechar lista e começar uma nova?" → calls `closeActiveList`.

### Task 6.4: E2E

- Add 3 items, check 2, close list.
- New active list appears empty.
- History shows the closed list with 3 items (including checked state).

### Task 6.5: Merge Phase 6

---

## Phase 7 — Admin actions

Branch: `feature/phase-7-admin`

### Task 7.1: Leave household

- `leaveHousehold({ db, householdId, uid })`:
  - Removes uid from `memberIds`
  - Deletes `members/{uid}`
  - Removes id from `users/{uid}.householdIds`
  - If the leaver is the only owner and there are other members, refuses (error: "transfer ownership first")
  - If the leaver is the last member, deletes the whole household (cascade lists + items client-side best-effort; document limitation — full cascade requires Cloud Function)
- Tests + dashboard menu item + E2E.

### Task 7.2: Rotate invite code (owner only)

- `rotateInviteCode({ db, householdId, actor })` — sets a new random `inviteCode`. Only works if `actor.uid` is the owner (rules enforce).

### Task 7.3: Remove member (owner only)

- `removeMember({ db, householdId, uidToRemove, actor })` — owner removes another member.

### Task 7.4: Delete household (owner, double confirm)

- `deleteHousehold({ db, householdId, actor })` — deletes household doc; document that subcollections must be cleaned by the client in the same operation (batch up to 500 items/listsas known limitation), or leave as future-work when Cloud Functions are added.

### Task 7.5: Merge Phase 7

---

## Phase 8 — Security Rules (comprehensive)

Branch: `feature/phase-8-rules`

Rules are written **last deliberately** because we now know every access pattern. Each rule has a dedicated test.

### Task 8.1: Rules test harness

**Files:**
- Create: `vitest.rules.config.ts`
- Create: `tests/rules/helpers.ts`

Config uses `environment: "node"`, loads `@firebase/rules-unit-testing`. Helper exposes `getTestEnv()` that reads `firestore.rules` and returns a `RulesTestEnvironment`.

### Task 8.2: Rules — users

Tests first. Write rules so:
- A user can create their own `users/{uid}` (uid == request.auth.uid)
- Cannot read or write another user's doc
- Cannot set `plan` to anything other than `"free"`
- `householdIds` can only be modified via server-side array ops (array-union of a household they just joined; max length 50) — implementation-wise this is hard to enforce fully without Cloud Functions; **document** that this is best-effort and the authoritative source is `households.memberIds`

### Task 8.3: Rules — households

- Read `households/{id}`: allowed if `request.auth.uid in resource.data.memberIds`
- Read by invite code query: allow a narrow rule for `findHouseholdByCode` (use a `list` with a `where inviteCode ==` clause; rule grants list access only when `request.query.limit == 1` and `resource.data.inviteCode == <arg>`) — or preferably, store the invite → household mapping in a separate collection `inviteCodes/{code}` with `{ householdId }` and looser read so the join flow works.
  - Recommended: **use the `inviteCodes` collection** (simpler rules). Adjust `createHousehold`, `rotateInviteCode`, and `findHouseholdByCode` accordingly; add a migration step if data exists (in MVP, no migration needed).
- Write household: only members; `memberIds` size ≤ 20; `createdBy` immutable
- Join: a non-member may update only the `memberIds` field, adding exactly their own uid, and only if `inviteCodes/{code}.householdId == householdId`

### Task 8.4: Rules — members

- Read: household members only
- Create: only self; `role="member"`; `color` from pool; `joinedAt == request.time`
- Update: self can update own `displayName`; owner can update any member's `role`
- Delete: self (leave) or owner (remove)

### Task 8.5: Rules — lists & items

- Lists: read/write only for household members; `createdAt == request.time`; `status` transitions limited (`active → closed` only, no reopen in MVP)
- Items:
  - Create: author sets `addedBy == request.auth.uid`, `checked == false`, `createdAt == request.time`, `name` 1–80, `quantity` ≤ 20
  - Update: any member can toggle `checked`; when setting true, `checkedBy == request.auth.uid`; deleting only by author or owner
  - Max 200 items per active list: enforced client-side (rule checking subcollection size is impossible in Firestore rules without a counter field on the list — **add `itemCount` field on the list doc**, maintained in the same transaction as item writes)

### Task 8.6: Adjust write paths to maintain `itemCount`

Update `addItem` and `deleteItem` to use a transaction that increments/decrements `list.itemCount`. Rule checks `list.itemCount < 200` before allowing item create.

### Task 8.7: Negative rule tests

For each rule above, write a test that asserts the operation is **denied** with appropriate context. Use `assertFails` from `@firebase/rules-unit-testing`.

### Task 8.8: Merge Phase 8

---

## Phase 9 — Polish, PWA, deploy

Branch: `feature/phase-9-polish`

### Task 9.1: PWA manifest + icons

Add `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, link in `layout.tsx` head.

### Task 9.2: Landing + auth pages polish

Use shadcn components consistently. Dark mode via `next-themes`.

### Task 9.3: Error boundaries + empty states

- Global error boundary with `sonner` toast on unhandled promise rejections
- Empty states for dashboard, active list, history

### Task 9.4: Settings page

`/settings` — edit global `displayName`, show `plan` (read-only badge), sign out.

### Task 9.5: Production Firebase project

- Create Firebase project in console (manual step for user)
- Enable Google provider + Email Link
- Add OAuth redirect URLs for local + Vercel preview + production domain
- Set `firestore.rules` via `firebase deploy --only firestore:rules`
- Fill production env vars in Vercel dashboard

### Task 9.6: Vercel deploy

- Link repo via `vercel` CLI
- First deploy as preview → verify Google + magic link → approve → deploy to production

### Task 9.7: Smoke tests on production

- Sign in, create household, invite second user, add item, close list — all manually verified.

### Task 9.8: Merge Phase 9

---

## Phase 10 — Monitoring & alerts (lightweight)

Branch: `feature/phase-10-monitoring`

### Task 10.1: Firebase budget alert

Configure in Firebase Console: email at 80% of free-tier daily read/write quotas (manual).

### Task 10.2: Sentry (optional, deferred)

Document in `docs/plans/` that Sentry hooks can be added later using the `sentry-setup-ai-monitoring`-style workflow if user adopts.

---

## Global definition of done

- `pnpm test` passes (unit + component)
- `pnpm test:rules` passes (rules in emulator)
- `pnpm test:e2e` passes (Playwright against local + emulator)
- `pnpm lint` clean
- `pnpm build` succeeds
- Design doc and any deviations recorded in `docs/plans/`
- All phases merged to `main` via `--no-ff`

---

## Notes for the executing engineer

- **TDD discipline:** never write an implementation file before the failing test that drove it.
- **Commit often:** every green test is a commit candidate.
- **Parallelizable work:** Tasks in different phases cannot run in parallel, but within a phase, unrelated components (e.g., `HouseholdCard` and `CreateHouseholdDialog`) can be split across subagents.
- **Re-read pass:** per CLAUDE.md §3, after each phase's tests go green, re-read every touched file looking for broken logic, dead code, missing edge cases, and inconsistencies — fix before merging.
- **Deviation:** if you find the design insufficient (e.g., rules require the `inviteCodes/{code}` collection change proposed in Task 8.3), update the design doc in the same PR and note the rationale.
