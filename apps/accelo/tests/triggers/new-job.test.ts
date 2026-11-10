import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockAcceloCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id: id });
const wrap = (items: unknown[]) => ({ meta: { status: "ok" }, response: items });
const ctx = (...pages: unknown[][]) => mockAcceloCtx(pages.map((p) => ({ body: wrap(p) })));

test("new-job seeds, emits, retries, and requests the newest page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.api.accelo.com/api/v0/jobs?_page=0&_limit=100&_filters=order_by_desc%28id%29",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-job reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const m = ctx([item("c"), item("b")], [item("z")]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [item("b"), item("c")]);
  assertEquals(m.calls.length, 1);
});
