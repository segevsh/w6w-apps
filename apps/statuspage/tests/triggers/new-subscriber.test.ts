import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-subscriber.ts";
import action from "../../actions/subscriber-list.ts";

const conn = { display: { pageId: "pg1" } };
const input = { params: {}, subscriptionId: "sub-1" };
const sub = (id: string) => ({ id, mode: "email" });
const ok = (items: unknown[]) => ({ status: 200, body: items });
const URL1 =
  "https://api.statuspage.io/v1/pages/pg1/subscribers?state=all&sort_field=created_at&sort_direction=desc&limit=100&page=0";

test("new-subscriber: seeds without emitting and asks the documented zero-based newest-first page", async () => {
  const m = mockCtx([ok([sub("a")])], conn);
  const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, URL1);
});

test("new-subscriber: emits only the unseen subscriber, and a retry gives the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([ok([sub("a")])], conn).ctx);
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([ok([sub("b"), sub("a")])], conn).ctx,
    );
  const first = await run();
  assertEquals(first.events, [sub("b")]);
  assertEquals(await run(), first);
});

test("new-subscriber: a pageId setting overrides the connection's page", async () => {
  const m = mockCtx([ok([])], conn);
  await trigger.poll!({ ...input, params: { pageId: "pg2" }, state: {} }, m.ctx);
  assertEquals(new URL(m.calls[0].url).pathname, "/v1/pages/pg2/subscribers");
});

test("subscriber-list: newestFirst pages from 0 with limit, 100 per request, and stops at the wanted count", async () => {
  const hundred = Array.from({ length: 100 }, (_, i) => sub(`s${i}`));
  const m = mockCtx([ok(hundred), ok([sub("t0"), sub("t1"), sub("t2")])], conn);
  const out = await action.execute!({ newestFirst: true, limit: 150 }, m.ctx) as {
    count: number;
  };
  assertEquals(out.count, 103);
  assertEquals(new URL(m.calls[0].url).searchParams.get("page"), "0");
  assertEquals(new URL(m.calls[0].url).searchParams.get("limit"), "100");
  assertEquals(new URL(m.calls[1].url).searchParams.get("page"), "1");
  assertEquals(new URL(m.calls[1].url).searchParams.get("limit"), "50");
  assertEquals(new URL(m.calls[0].url).searchParams.get("per_page"), null);
});

test("subscriber-list: without newestFirst the request is unchanged (page=1&per_page, no sort)", async () => {
  const m = mockCtx([ok([sub("a")])], conn);
  await action.execute!({}, m.ctx);
  const u = new URL(m.calls[0].url);
  assertEquals(u.searchParams.get("page"), "1");
  assertEquals(u.searchParams.get("per_page"), "50");
  assertEquals(u.searchParams.get("sort_field"), null);
});
