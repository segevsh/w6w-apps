import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockConnectedCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-audit-log.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) =>
  mockConnectedCtx([{ body: { events: items, pagination: { total: items.length } } }]);
const item = (id: string) => ({ id });

test("new-audit-log: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(
    seed.calls[0].url,
    "https://app.base44.com/api/v1/audit-logs/wksp-unit-test-0001/list",
  );
  assertEquals(JSON.parse(seed.calls[0].body!), { limit: 100, order: "DESC" });
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
