import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-product.ts";

test("new-product seeds, emits, retries, and walks every product page", async () => {
  const old = { id: 1 }, fresh = { id: 2 }, later = { id: 3 };
  const seed = mockCtx([
    { body: listEnvelope([old], { next_page_token: "t1" }) },
    { body: listEnvelope([later]) },
  ]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = () =>
    mockCtx([
      { body: listEnvelope([old], { next_page_token: "t1" }) },
      { body: listEnvelope([later, fresh]) },
    ]).ctx;
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, next());
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState } as never, next()),
    result,
  );
  assertEquals(seed.calls.map((c) => new URL(c.url).toString()), [
    "https://developers.hotmart.com/products/api/v1/products?max_results=100",
    "https://developers.hotmart.com/products/api/v1/products?max_results=100&page_token=t1",
  ]);
});
