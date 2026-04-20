import { afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  closeTestEnv,
  getTestEnv,
  reset,
  seedHousehold,
} from "./helpers";

async function seedItem(
  env: Awaited<ReturnType<typeof getTestEnv>>,
  {
    householdId,
    listId,
    itemId,
    addedBy,
    checked = false,
  }: {
    householdId: string;
    listId: string;
    itemId: string;
    addedBy: string;
    checked?: boolean;
  },
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(
        ctx.firestore(),
        `households/${householdId}/lists/${listId}/items/${itemId}`,
      ),
      {
        id: itemId,
        name: "leite",
        quantity: "2L",
        addedBy,
        addedByName: addedBy,
        addedByColor: "#ef4444",
        checked,
        checkedBy: checked ? addedBy : null,
        createdAt: new Date(),
      },
    );
  });
}

describe("items rules", () => {
  beforeEach(reset);
  afterAll(closeTestEnv);

  const path = (h: string, l: string, i: string) =>
    `households/${h}/lists/${l}/items/${i}`;

  it("member can create item with own addedBy", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      setDoc(doc(bob.firestore(), path("h1", "l1", "i1")), {
        id: "i1",
        name: "leite",
        quantity: "",
        addedBy: "bob",
        addedByName: "Bob",
        addedByColor: "#3b82f6",
        checked: false,
        checkedBy: null,
        createdAt: new Date(),
      }),
    );
  });

  it("rejects creating item with addedBy != auth uid", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      setDoc(doc(bob.firestore(), path("h1", "l1", "i1")), {
        id: "i1",
        name: "leite",
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

  it("rejects items with name > 80 chars", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), path("h1", "l1", "i1")), {
        id: "i1",
        name: "a".repeat(81),
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

  it("rejects items on a closed list", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "households/h1/lists/l1"), {
        status: "closed",
      });
    });
    const alice = env.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), path("h1", "l1", "i1")), {
        id: "i1",
        name: "leite",
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

  it("non-member cannot create item", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      activeListId: "l1",
    });
    const carol = env.authenticatedContext("carol");
    await assertFails(
      setDoc(doc(carol.firestore(), path("h1", "l1", "i1")), {
        id: "i1",
        name: "leite",
        quantity: "",
        addedBy: "carol",
        addedByName: "Carol",
        addedByColor: "#ef4444",
        checked: false,
        checkedBy: null,
        createdAt: new Date(),
      }),
    );
  });

  it("any member can toggle checked, setting checkedBy to own uid", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    await seedItem(env, {
      householdId: "h1",
      listId: "l1",
      itemId: "i1",
      addedBy: "alice",
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      updateDoc(doc(bob.firestore(), path("h1", "l1", "i1")), {
        checked: true,
        checkedBy: "bob",
      }),
    );
  });

  it("toggling check rejects checkedBy pointing at another user", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    await seedItem(env, {
      householdId: "h1",
      listId: "l1",
      itemId: "i1",
      addedBy: "alice",
    });
    const bob = env.authenticatedContext("bob");
    await assertFails(
      updateDoc(doc(bob.firestore(), path("h1", "l1", "i1")), {
        checked: true,
        checkedBy: "alice",
      }),
    );
  });

  it("author can delete their own item", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    await seedItem(env, {
      householdId: "h1",
      listId: "l1",
      itemId: "i1",
      addedBy: "bob",
    });
    const bob = env.authenticatedContext("bob");
    await assertSucceeds(
      deleteDoc(doc(bob.firestore(), path("h1", "l1", "i1"))),
    );
  });

  it("non-author member cannot delete another member's item", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob", "carol"],
      activeListId: "l1",
    });
    await seedItem(env, {
      householdId: "h1",
      listId: "l1",
      itemId: "i1",
      addedBy: "bob",
    });
    const carol = env.authenticatedContext("carol");
    await assertFails(
      deleteDoc(doc(carol.firestore(), path("h1", "l1", "i1"))),
    );
  });

  it("owner can delete any item", async () => {
    const env = await getTestEnv();
    await seedHousehold(env, {
      householdId: "h1",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      activeListId: "l1",
    });
    await seedItem(env, {
      householdId: "h1",
      listId: "l1",
      itemId: "i1",
      addedBy: "bob",
    });
    const alice = env.authenticatedContext("alice");
    await assertSucceeds(
      deleteDoc(doc(alice.firestore(), path("h1", "l1", "i1"))),
    );
  });
});
