import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const item = (messageId: string) => ({ messageId });
const body = (items: unknown[]) => ({ messageList: items });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-message seeds, emits new rows, retries, and requests the literal message feed", async () => {
  const seed = mockCtx([{ body: body([item("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.solapi.com/messages/v4/list?dateType=CREATED&limit=200",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([item("b"), item("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([item("b"), item("a")]) }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
