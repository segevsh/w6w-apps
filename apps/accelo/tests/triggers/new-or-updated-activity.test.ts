import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockAcceloCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-activity.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, date_modified = "100") => ({ id, date_modified });
const wrap = (items: unknown[]) => ({ meta: { status: "ok" }, response: items });
const ctx = (...pages: unknown[][]) => mockAcceloCtx(pages.map((p) => ({ body: wrap(p) })));

test("new-or-updated-activity seeds, emits, retries, and requests the newest page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.api.accelo.com/api/v0/activities?_page=0&_limit=100&_filters=order_by_desc%28date_modified%29",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-activity reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const m = ctx([item("c"), item("b")], [item("z")]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [item("b"), item("c")]);
  assertEquals(m.calls.length, 1);
});

test("new-or-updated-activity emits a seen activity again once its date_modified moves", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const got = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("a", "200"), item("b")]).ctx,
  );
  assertEquals(got.events, [item("b"), item("a", "200")]);
});
