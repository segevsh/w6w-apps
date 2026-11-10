import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-sms-notification.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ object: "notification", id, type: "sms" });
const ctx = (ids: string[]) => mockCtx([{ body: { object: "list", data: ids.map(item) } }]);

test("new-sms-notification: seeds, emits only new items, retries idempotently, requests the list", async () => {
  const seed = ctx(["SMS-1"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.oncehub.com/v2/notifications/sms?limit=100");

  const page = ["SMS-2", "SMS-1"];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("SMS-2")]);
  assertEquals(retry, first);
});
