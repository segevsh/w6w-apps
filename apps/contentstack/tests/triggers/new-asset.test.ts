import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-asset.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const respond = (items: unknown[]) => ({ body: { assets: items, count: items.length } });
const item = (uid: string, u = "2026-11-09T10:00:00.000Z") => ({ uid, updated_at: u });
const ctx = (items: unknown[]) => mockCtx([respond(items)]);

test("new-asset: seeds without flooding and sends the documented request", async () => {
  const seed = ctx([item("blta")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.contentstack.io/v3/assets?desc=created_at&limit=100&skip=0",
  );
});

test("new-asset: emits only the new item", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("blta")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("bltb"), item("blta")]).ctx,
  );
  assertEquals(result.events, [item("bltb")]);
});

test("new-asset: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("blta")]).ctx);
  const page = [item("bltb"), item("blta")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
