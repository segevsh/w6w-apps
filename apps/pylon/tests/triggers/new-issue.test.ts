import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T10:00:00Z");
const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return {
    method: c.method,
    url: u.origin + u.pathname,
    query: Object.fromEntries(u.searchParams),
  };
};
const issue = (id: string, title = "t") => ({
  id,
  title,
  state: "new",
  created_at: "2026-11-10T09:59:00Z",
});
const reply = (items: unknown[]) => ({
  body: { data: items, pagination: { cursor: null, has_next_page: false } },
});

test("new-issue seeds, emits, retries, and sends the literal since-filtered request", async () => {
  clock.now = () => T0;
  const seed = mockCtx([reply([issue("i1")])]);
  const seeded = await trigger.poll!(input({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(req(seed.calls[0]), {
    method: "GET",
    url: "https://api.usepylon.com/issues",
    query: { start_time: "2026-11-10T09:58:00Z", end_time: "2026-11-10T10:00:00Z", limit: "200" },
  });

  clock.now = () => T0 + 300_000;
  const page = [issue("i2"), issue("i1")];
  const run = () => mockCtx([reply(page)]);
  const first = run();
  const out = await trigger.poll!(input(seeded.nextState), first.ctx);
  const retry = await trigger.poll!(input(seeded.nextState), run().ctx);
  assertEquals(out.events, [issue("i2")]);
  assertEquals(retry, out);
  assertEquals(req(first.calls[0]), {
    method: "GET",
    url: "https://api.usepylon.com/issues",
    query: { start_time: "2026-11-10T09:58:00Z", end_time: "2026-11-10T10:05:00Z", limit: "200" },
  });
});

test("new-issue skips an already seen record", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(input({}), mockCtx([reply([issue("i1")])]).ctx);
  clock.now = () => T0 + 300_000;
  const out = await trigger.poll!(input(seeded.nextState), mockCtx([reply([issue("i1")])]).ctx);
  assertEquals(out.events, []);
});
