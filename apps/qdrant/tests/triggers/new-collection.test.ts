import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-collection.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (collections: unknown[]) =>
  mockCtx([{ body: { collections } }], {
    display: { url: "https://xyz.cloud.qdrant.io:6333" },
  });

test("new-collection snapshots the complete directory and emits additions only", async () => {
  const seed = ctx([{ name: "first" }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, path: new URL(seed.calls[0].url).pathname }, {
    method: "GET",
    path: "/collections",
  });
  const added = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ name: "first" }, { name: "second" }]).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ name: "first" }]).ctx,
  );
  assertEquals(added.events, [{ name: "second" }]);
  assertEquals(edited.events, []);
});
