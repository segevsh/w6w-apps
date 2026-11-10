import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-message.ts";

const item = (messageId: string, dateUpdated: string) => ({ messageId, dateUpdated });
const body = (items: unknown[]) => ({ messageList: items });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-or-updated-message seeds, emits an edit, retries, and requests UPDATED literally", async () => {
  const old = item("a", "2026-11-09T11:00:00Z");
  const seed = mockCtx([{ body: body([old]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.solapi.com/messages/v4/list?dateType=UPDATED&limit=200",
  );
  const changed = item("a", "2026-11-09T12:00:00Z");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([changed, old]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([changed, old]) }]).ctx,
  );
  assertEquals(first.events, [changed]);
  assertEquals(retry, first);
});
