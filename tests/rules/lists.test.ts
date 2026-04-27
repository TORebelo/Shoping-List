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
import { closeTestEnv, getTestEnv, reset, seedList } from "./helpers";

describe("lists rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("member can read their list", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(getDoc(doc(alice.firestore(), "lists/l1")));
  });

  it("non-member cannot read list", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(getDoc(doc(bob.firestore(), "lists/l1")));
  });

  it("create: user can create a list they own, with themselves as only member", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "lists/new"), {
        id: "new",
        name: "Compras",
        createdBy: "alice",
        memberIds: ["alice"],
        inviteCode: "code1",
        status: "active",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("create: rejects name > 60 chars", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "lists/new"), {
        id: "new",
        name: "a".repeat(61),
        createdBy: "alice",
        memberIds: ["alice"],
        inviteCode: "c",
        status: "active",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("create: rejects status=closed at creation", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "lists/new"), {
        id: "new",
        name: "Compras",
        createdBy: "alice",
        memberIds: ["alice"],
        inviteCode: "c",
        status: "closed",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("create: rejects impersonating another createdBy", async () => {
    const env = await getTestEnv();
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "lists/new"), {
        id: "new",
        name: "Compras",
        createdBy: "bob",
        memberIds: ["alice"],
        inviteCode: "c",
        status: "active",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("update: member can rename", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "lists/l1"), { name: "Compras nova" }),
    );
  });

  it("update: non-member cannot mutate list", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "lists/l1"), { name: "Hack" }),
    );
  });

  it("update: active → closed transition allowed", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "lists/l1"), { status: "closed" }),
    );
  });

  it("update: closed → active transition rejected", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      status: "closed",
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "lists/l1"), { status: "active" }),
    );
  });

  it("update: itemCount changes by ±1 only", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "lists/l1"), { itemCount: 50 }),
    );
  });

  it("update: non-member can join via valid invite code", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      updateDoc(doc(bob.firestore(), "lists/l1"), {
        memberIds: arrayUnion("bob"),
      }),
    );
  });

  it("update: non-member cannot add a different uid as member", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "lists/l1"), {
        memberIds: arrayUnion("carol"),
      }),
    );
  });

  it("update: createdBy is immutable", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "lists/l1"), { createdBy: "bob" }),
    );
  });

  it("delete: only owner can delete", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(deleteDoc(doc(bob.firestore(), "lists/l1")));
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(deleteDoc(doc(alice.firestore(), "lists/l1")));
  });

  it("delete: promoted owner (not list creator) can delete", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      ownerUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(deleteDoc(doc(bob.firestore(), "lists/l1")));
  });
});
