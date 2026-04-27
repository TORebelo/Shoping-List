import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { closeTestEnv, getTestEnv, reset, seedList } from "./helpers";

describe("members rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("signed-in user can read member doc (knowing the list id is the capability)", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      getDoc(doc(bob.firestore(), "lists/l1/members/alice")),
    );
  });

  it("unauthenticated request cannot read member doc", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const anon = env.unauthenticatedContext();
    await assertFails(
      getDoc(doc(anon.firestore(), "lists/l1/members/alice")),
    );
  });

  it("self can create their own member doc after joining", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      setDoc(doc(bob.firestore(), "lists/l1/members/bob"), {
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
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      setDoc(doc(bob.firestore(), "lists/l1/members/carol"), {
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
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "lists/l1/members/alice"), {
        displayName: "Ana Silva",
      }),
    );
  });

  it("cannot update another member's displayName", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "lists/l1/members/alice"), {
        displayName: "Hacked",
      }),
    );
  });

  it("owner can remove another member", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      deleteDoc(doc(alice.firestore(), "lists/l1/members/bob")),
    );
  });

  it("non-owner cannot remove another member", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      deleteDoc(doc(bob.firestore(), "lists/l1/members/carol")),
    );
  });

  it("self can leave by deleting own member doc", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      deleteDoc(doc(bob.firestore(), "lists/l1/members/bob")),
    );
  });

  it("joining member cannot self-assign 'owner' role", async () => {
    const env = await getTestEnv();
    await seedList(env, { listId: "l1", ownerUid: "alice" });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      setDoc(doc(bob.firestore(), "lists/l1/members/bob"), {
        uid: "bob",
        displayName: "Bob",
        color: "#3b82f6",
        role: "owner",
        joinedAt: new Date(),
      }),
    );
  });

  it("promoted owner can change another member's role", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
      ownerUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      updateDoc(doc(bob.firestore(), "lists/l1/members/carol"), {
        role: "owner",
      }),
    );
  });

  it("plain member cannot change another member's role", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), "lists/l1/members/carol"), {
        role: "owner",
      }),
    );
  });

  it("promoted owner can remove another member", async () => {
    const env = await getTestEnv();
    await seedList(env, {
      listId: "l1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
      ownerUids: ["alice", "bob"],
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      deleteDoc(doc(bob.firestore(), "lists/l1/members/carol")),
    );
  });
});
