import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import {
  closeTestEnv,
  getTestEnv,
  reset,
  seedHousehold,
} from "./helpers";

describe("lists rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  it("member can create a new list with status=active", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "households/h1/lists/l2"), {
        id: "l2",
        title: "Outra",
        status: "active",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("cannot create a list already closed", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, { householdId: "h1", ownerUid: "alice" });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "households/h1/lists/l2"), {
        id: "l2",
        title: "Outra",
        status: "closed",
        itemCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it("list can transition active -> closed", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "households/h1/lists/l1"), {
        status: "closed",
      }),
    );
  });

  it("list cannot transition closed -> active", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    await env.withSecurityRulesDisabled(async (seed) => {
      await updateDoc(doc(seed.firestore(), "households/h1/lists/l1"), {
        status: "closed",
      });
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "households/h1/lists/l1"), {
        status: "active",
      }),
    );
  });

  it("itemCount can only change by ±1 per write", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(alice.firestore(), "households/h1/lists/l1"), {
        itemCount: 50,
      }),
    );
  });

  it("cannot add a 201st item (itemCount cap enforced)", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    await env.withSecurityRulesDisabled(async (seed) => {
      await updateDoc(doc(seed.firestore(), "households/h1/lists/l1"), {
        itemCount: 200,
      });
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "households/h1/lists/l1/items/cap"), {
        id: "cap",
        name: "over",
        quantity: "",
        addedBy: "alice",
        addedByName: "Ana",
        addedByColor: "#ef4444",
        checked: false,
        checkedBy: null,
        createdAt: new Date(),
      }),
    );
  });
});
