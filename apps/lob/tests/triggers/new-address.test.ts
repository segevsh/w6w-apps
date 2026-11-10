import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-address.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const response = (data: unknown[]) => ({
  body: { data, count: data.length, next_url: null, previous_url: null },
});

test("new-address seeds, emits, retries, and requests the literal newest-first page", async () => {
  const old = { id: "adr_1" };
  const fresh = { id: "adr_2" };
  const seed = mockCtx([response([old])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.lob.com/v1/addresses?limit=100");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response([fresh, old])]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response([fresh, old])]).ctx,
  );
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
});
