import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBasecampCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id: id });
const wrap = (items: unknown[]) => items;
const ctx = (...pages: unknown[][]) => mockBasecampCtx(pages.map((p) => ({ body: wrap(p) })));

test("new-project seeds, emits, retries, and requests the newest page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://3.basecampapi.com/999999999/projects.json");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-project reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const m = ctx([item("c"), item("b")], [item("z")]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [item("b"), item("c")]);
  assertEquals(m.calls.length, 1);
});
