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
 * Seed a list + its owner member + user docs using a context that bypasses
 * security rules (for arranging state in tests).
 */
export async function seedList(
  env: RulesTestEnvironment,
  opts: {
    listId: string;
    ownerUid: string;
    memberUids?: string[];
    ownerUids?: string[];
    inviteCode?: string;
    status?: "active" | "closed";
    itemCount?: number;
  },
) {
  const {
    listId,
    ownerUid,
    memberUids = [ownerUid],
    ownerUids = [ownerUid],
    inviteCode = `inv-${listId}`,
    status = "active",
    itemCount = 0,
  } = opts;

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "lists", listId), {
      id: listId,
      name: "Compras",
      createdBy: ownerUid,
      memberIds: memberUids,
      inviteCode,
      status,
      itemCount,
      createdAt: new Date(),
    });
    for (const uid of memberUids) {
      await setDoc(doc(db, "lists", listId, "members", uid), {
        uid,
        displayName: uid,
        color: "#ef4444",
        role: ownerUids.includes(uid) ? "owner" : "member",
        joinedAt: new Date(),
      });
      await setDoc(doc(db, "users", uid), {
        uid,
        email: `${uid}@example.com`,
        displayName: uid,
        plan: "free",
        listIds: [listId],
        createdAt: new Date(),
      });
    }
    await setDoc(doc(db, "inviteCodes", inviteCode), {
      code: inviteCode,
      listId,
      createdAt: new Date(),
    });
  });

  return { listId, ownerUid, memberUids, inviteCode };
}
