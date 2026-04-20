import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {
  closeTestEnv,
  getTestEnv,
  reset,
  seedHousehold,
} from "./helpers";

describe("members rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("member can read member list", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      getDoc(doc(bob.firestore(), "households/h1/members/alice")),
    );
  });

  it("signed-in non-member can read member doc (knowing the 20-char household id is the capability)", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const carol = env.authenticatedContext("carol");
    await assertSucceeds(
      getDoc(doc(carol.firestore(), "households/h1/members/alice")),
    );
  });

  it("unauthenticated request cannot read member doc", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const anon = env.unauthenticatedContext();
    await assertFails(
      getDoc(doc(anon.firestore(), "households/h1/members/alice")),
    );
  });

  it("self can create their own member doc after joining", async () => {
    const env = await getTestEnv();
    // Seed without bob; then bob creates the doc during his join flow.
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      setDoc(doc(bob.firestore(), "households/h1/members/bob"), {
        uid: "bob",
        displayName: "Bob",
        color: "#3b82f6",
        role: "member",
        joinedAt: new Date(),
      }),
    );
  });

  it("cannot create member doc at another uid", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      setDoc(doc(bob.firestore(), "households/h1/members/carol"), {
        uid: "carol",
        displayName: "Carol",
        color: "#3b82f6",
        role: "member",
        joinedAt: new Date(),
      }),
    );
  });

  it("self can update own displayName", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "households/h1/members/alice"), {
        displayName: "Ana Silva",
      }),
    );
  });

  it("cannot update another member's displayName", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "households/h1/members/alice"), {
        displayName: "Hacked",
      }),
    );
  });

  it("owner can remove another member", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      deleteDoc(doc(alice.firestore(), "households/h1/members/bob")),
    );
  });

  it("non-owner cannot remove another member", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      deleteDoc(doc(bob.firestore(), "households/h1/members/carol")),
    );
  });

  it("self can leave by deleting own member doc", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      deleteDoc(doc(bob.firestore(), "households/h1/members/bob")),
    );
  });
});
