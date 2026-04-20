import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { closeTestEnv, getTestEnv, reset } from "./helpers";

describe("users rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("user can create their own users/{uid} with plan=free", async () => {
    const env = await getTestEnv();
    const ctx = env.authenticatedContext("alice");
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), "users/alice"), {
        uid: "alice",
        email: "a@b.c",
        displayName: "Ana",
        plan: "free",
        householdIds: [],
        createdAt: new Date(),
      }),
    );
  });

  it("cannot create a user doc at another uid", async () => {
    const env = await getTestEnv();
    const ctx = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(ctx.firestore(), "users/bob"), {
        uid: "bob",
        email: "b@c.d",
        displayName: "Bob",
        plan: "free",
        householdIds: [],
        createdAt: new Date(),
      }),
    );
  });

  it("cannot create a user doc with plan != free", async () => {
    const env = await getTestEnv();
    const ctx = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(ctx.firestore(), "users/alice"), {
        uid: "alice",
        email: "a@b.c",
        displayName: "Ana",
        plan: "pro",
        householdIds: [],
        createdAt: new Date(),
      }),
    );
  });

  it("cannot read another user's doc", async () => {
    const env = await getTestEnv();
    await env.withSecurityRulesDisabled(async (seed) => {
      await setDoc(doc(seed.firestore(), "users/bob"), {
        uid: "bob",
        email: "b@c.d",
        displayName: "Bob",
        plan: "free",
        householdIds: [],
        createdAt: new Date(),
      });
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(getDoc(doc(alice.firestore(), "users/bob")));
  });

  it("cannot upgrade plan via update", async () => {
    const env = await getTestEnv();
    await env.withSecurityRulesDisabled(async (seed) => {
      await setDoc(doc(seed.firestore(), "users/alice"), {
        uid: "alice",
        email: "a@b.c",
        displayName: "Ana",
        plan: "free",
        householdIds: [],
        createdAt: new Date(),
      });
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "users/alice"), { plan: "pro" }),
    );
  });

  it("unauthenticated users cannot write", async () => {
    const env = await getTestEnv();
    const anon = env.unauthenticatedContext();
    await assertFails(
      setDoc(doc(anon.firestore(), "users/anon"), {
        uid: "anon",
        email: "",
        displayName: "",
        plan: "free",
        householdIds: [],
        createdAt: new Date(),
      }),
    );
  });
});
