import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-image.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (uid: string) => ({ uid });
const ctx = (images: unknown[]) => mockCtx([{ body: images }]);

test("new-image seeds, emits, retries, and requests the newest image page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.bannerbear.com/v5/images?page=1");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-image reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const m = ctx([item("c"), item("b")]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [item("b"), item("c")]);
  assertEquals(m.calls.length, 1);
});
