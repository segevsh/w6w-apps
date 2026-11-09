import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-ticket.ts";
const page = (items: unknown[]) => ({ success: true, data: { items, has_more: false } });
test("new-ticket seeds, emits, retries, and requests a bounded ticket page", async () => {
  const input = { params: { ticketFormId: "tf1" }, subscriptionId: "s" };
  const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.aidbase.ai/v1/ticket-form/tf1/tickets?limit=100");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
