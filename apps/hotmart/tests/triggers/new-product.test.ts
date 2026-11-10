import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-product.ts";

test("new-product seeds, emits, retries, and requests a bounded product page", async () => {
  const old = { id: 1 }, fresh = { id: 2 };
  const seed = mockCtx([{ body: listEnvelope([old]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: listEnvelope([fresh, old]) }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: listEnvelope([fresh, old]) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://developers.hotmart.com/products/api/v1/products?max_results=100",
  );
});
