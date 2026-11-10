import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockAcceloCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-activity.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, modified: string) => ({ id, date_modified: modified });
const wrap = (items: unknown[]) => ({ meta: { status: "ok" }, response: items });
const ctx = (...pages: unknown[][]) => mockAcceloCtx(pages.map((p) => ({ body: wrap(p) })));

test("new-or-updated-activity seeds, emits a new activity, retries, and asks for date_modified newest-modified first", async () => {
  const seed = ctx([item("a", "100")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.api.accelo.com/api/v0/activities?_page=0&_limit=100&_fields=date_modified&_filters=order_by_desc%28date_modified%29",
  );
  const page = [item("b", "300"), item("a", "100")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b", "300")]);
  assertEquals(retry, first);
});

test("new-or-updated-activity: an edit of a known activity is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item("a", "100"), item("b", "90")]).ctx,
  );
  const got = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("a", "400"), item("b", "90")]).ctx,
  );
  assertEquals(got.events, [item("a", "400")]);
});
