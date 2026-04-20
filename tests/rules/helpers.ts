import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let env: RulesTestEnvironment | null = null;

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (env) return env;
  env = await initializeTestEnvironment({
    projectId: "shopinglist-rules-test",
    firestore: {
      rules: readFileSync(
        resolve(process.cwd(), "firestore.rules"),
        "utf8",
      ),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  return env;
}

export async function closeTestEnv(): Promise<void> {
  if (env) {
    await env.cleanup();
    env = null;
  }
}

export async function reset(): Promise<void> {
  const e = await getTestEnv();
  await e.clearFirestore();
}

/**
 * Seed a household + owner member + active list using a context that
 * bypasses security rules (for arranging state in tests).
 */
export async function seedHousehold(
  env: RulesTestEnvironment,
  opts: {
    householdId: string;
    ownerUid: string;
    memberUids?: string[];
    inviteCode?: string;
    activeListId?: string;
  },
) {
  const {
    householdId,
    ownerUid,
    memberUids = [ownerUid],
    inviteCode = `inv-${householdId}`,
    activeListId = `list-${householdId}`,
  } = opts;

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "households", householdId), {
      id: householdId,
      name: "Casa",
      createdBy: ownerUid,
      memberIds: memberUids,
      inviteCode,
      activeListId,
      createdAt: new Date(),
    });
    for (const uid of memberUids) {
      await setDoc(doc(db, "households", householdId, "members", uid), {
        uid,
        displayName: uid,
        color: "#ef4444",
        role: uid === ownerUid ? "owner" : "member",
        joinedAt: new Date(),
      });
      await setDoc(doc(db, "users", uid), {
        uid,
        email: `${uid}@example.com`,
        displayName: uid,
        plan: "free",
        householdIds: [householdId],
        createdAt: new Date(),
      });
    }
    await setDoc(
      doc(db, "households", householdId, "lists", activeListId),
      {
        id: activeListId,
        title: "Compras",
        status: "active",
        itemCount: 0,
        createdAt: new Date(),
      },
    );
    await setDoc(doc(db, "inviteCodes", inviteCode), {
      code: inviteCode,
      householdId,
      createdAt: new Date(),
    });
  });

  return { householdId, ownerUid, memberUids, inviteCode, activeListId };
}
