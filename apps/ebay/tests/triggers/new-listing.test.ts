import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-listing.ts";

const page = (itemSummaries: unknown[]) => ({ body: { itemSummaries } });

test("new-listing seeds, emits unseen listings, retries idempotently, and requests newest first", async () => {
  const params = { q: "camera" };
  const seeded = await trigger.poll!(
    { params, state: {} } as never,
    mockCtx([page([{ itemId: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ itemId: "b" }, { itemId: "a" }])]);
  const next = await trigger.poll!({ params, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ itemId: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seeded.nextState } as never,
    mockCtx([page([{ itemId: "b" }, { itemId: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.ebay.com/buy/browse/v1/item_summary/search?q=camera&sort=newlyListed&limit=100&offset=0",
  );
});
