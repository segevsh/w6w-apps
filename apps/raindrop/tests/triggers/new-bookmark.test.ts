import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-bookmark.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-bookmark: seeds, emits new rows, retries idempotently, and requests the literal feed", async () => {
  const seed = ctx({ items: [{ _id: 1 }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.raindrop.io/rest/v1/raindrops/0?sort=-created&perpage=50&page=0",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ _id: 2 }, { _id: 1 }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ _id: 2 }, { _id: 1 }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ _id: 2 }]);
  assertEquals(retry, first);
});
