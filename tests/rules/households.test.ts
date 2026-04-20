import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  closeTestEnv,
  getTestEnv,
  reset,
  seedHousehold,
} from "./helpers";

describe("households rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("member can read their household", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(getDoc(doc(alice.firestore(), "households/h1")));
  });

  it("non-member cannot read household", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(getDoc(doc(bob.firestore(), "households/h1")));
  });

  it("create: user can create a household they created + are the only member", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "households/newh"), {
        id: "newh",
        name: "Casa",
        createdBy: "alice",
        memberIds: ["alice"],
        inviteCode: "code1",
        activeListId: "l1",
        createdAt: new Date(),
      }),
    );
  });

  it("create: rejects name > 60 chars", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "households/newh"), {
        id: "newh",
        name: "a".repeat(61),
        createdBy: "alice",
        memberIds: ["alice"],
        inviteCode: "c",
        activeListId: "l",
        createdAt: new Date(),
      }),
    );
  });

  it("create: rejects impersonating another createdBy", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "households/newh"), {
        id: "newh",
        name: "Casa",
        createdBy: "bob",
        memberIds: ["alice"],
        inviteCode: "c",
        activeListId: "l",
        createdAt: new Date(),
      }),
    );
  });

  it("update: member can change name", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "households/h1"), {
        name: "Casa Nova",
      }),
    );
  });

  it("update: non-member cannot mutate household", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "households/h1"), {
        name: "Casa Roubada",
      }),
    );
  });

  it("update: non-member can join via valid invite code, adding own uid", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      inviteCode: "open1",
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      updateDoc(doc(bob.firestore(), "households/h1"), {
        memberIds: arrayUnion("bob"),
      }),
    );
  });

  it("update: non-member cannot add a different uid as member", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      inviteCode: "open1",
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "households/h1"), {
        memberIds: arrayUnion("carol"),
      }),
    );
  });

  it("update: createdBy is immutable", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "households/h1"), {
        createdBy: "bob",
      }),
    );
  });

  it("delete: only owner can delete", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(deleteDoc(doc(bob.firestore(), "households/h1")));
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(deleteDoc(doc(alice.firestore(), "households/h1")));
  });
});
