import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

// Newest-first feed (sorting_order=desc): the trigger asks the wrapped action for the newest first.
const params = { chatId: 77 };
const input = { params, subscriptionId: "sub-1" };
const item = (id: string) => ({ uid: id });
const reply = (items: unknown[]) => ({ data: { messages: items } });
const ctx = (items: unknown[]) => mockCtx([{ body: reply(items) }]);

test("new-message: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seed = ctx([item("m1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("m2"), item("m1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("m2")]);
  assertEquals(retry, first);
});

test("new-message: requests the newest first with the wrapped action's endpoint", async () => {
  const m = ctx([item("m1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://app.timelines.ai/integrations/api/chats/77/messages?sorting_order=desc",
  );
});
