import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const event = (id: string) => ({ id });

test("new-event: seeds, emits only new events, retries idempotently, requests the event log", async () => {
  const seed = mockCtx([{ body: { data: [event("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.bitwarden.com/public/events");

  const response = { data: [event("b"), event("a")] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [event("b")]);
  assertEquals(retry, first);
});
