import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-collection.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-collection: seeds, emits only added rows, retries idempotently, and requests the literal list", async () => {
  const seed = ctx({ items: [{ _id: 1, title: "A" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.raindrop.io/rest/v1/collections",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ _id: 2, title: "B" }, { _id: 1, title: "A" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ _id: 2, title: "B" }, { _id: 1, title: "A" }] }).ctx,
  );
  assertEquals(first.events, [{ _id: 2, title: "B" }]);
  assertEquals(retry, first);

  // an edited row (same key, new values) is not a "new" record
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ _id: 1, title: "A renamed" }] }).ctx,
  );
  assertEquals(edited.events, []);
});
