import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const input = { params: { roomId: "9" }, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => items;
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (id: string) => ({ message_id: id, send_time: 1794128400, body: "hi" });

test("new-message: seeds without emitting, emits only the new item, retries idempotently", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-message: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.chatwork.com/v2/rooms/9/messages?force=1");
});
