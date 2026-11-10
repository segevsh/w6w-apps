import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-profile.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const response = (data: unknown[]) => ({ body: { data, links: {} } });

test("new-profile seeds, emits, retries, and requests the literal created sort", async () => {
  const old = { id: "p1" };
  const fresh = { id: "p2" };
  const seed = mockCtx([response([old])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://a.klaviyo.com/api/profiles/?sort=-created&page%5Bsize%5D=100",
  );
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
