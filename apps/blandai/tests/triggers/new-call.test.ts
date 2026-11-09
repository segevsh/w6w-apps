import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-call.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const call = (c_id: string) => ({ c_id });

test("new-call: seeds, emits only new calls, retries idempotently, requests newest first", async () => {
  const seed = mockCtx([{ body: { calls: [call("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.bland.ai/v1/calls?limit=100&ascending=false");

  const response = { calls: [call("b"), call("a")] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [call("b")]);
  assertEquals(retry, first);
});
