import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-audit-log-entry.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = 1762689600000;
const entry = (id: string, date = T0) => ({ _id: id, date, kind: "flag", name: id });
const page = (...ids: string[]) => ({ status: 200, body: { items: ids.map((id) => entry(id)) } });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-audit-log-entry: first check seeds the cursor, emits nothing, asks after=now", async () => {
  clock.now = () => T0;
  const seed = mockCtx([page("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const state = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(state.seeded, true);
  assertEquals(state.cursor, T0);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.pathname, "/api/v2/auditlog");
  assertEquals(url.searchParams.get("after"), String(T0 - 120_000));
  assertEquals(url.searchParams.get("limit"), "20");
});

test("new-audit-log-entry: emits the new entry only, after the previous cursor, idempotently", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page("a")]).ctx);
  clock.now = () => T0 + 300_000;
  const run = () => {
    const r = mockCtx([page("b", "a")]);
    return trigger.poll!({ ...input, state: seeded.nextState }, r.ctx).then((out) => ({ out, r }));
  };
  const first = await run();
  assertEquals(first.out.events, [entry("b")]);
  assertEquals((first.out.nextState as { cursor?: number }).cursor, T0 + 300_000);
  assertEquals(new URL(first.r.calls[0].url).searchParams.get("after"), String(T0 - 120_000));
  assertEquals((await run()).out, first.out);
});

test("new-audit-log-entry: a window of maxPages+1 full pages drains across checks, none twice, cursor advances after", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page("seed")]).ctx);
  clock.now = () => T0 + 300_000;
  // 6 full pages of 20 (ids e120 newest .. e001 oldest), then an empty page. Dates fall with the id.
  const dated = (n: number) => entry(`e${String(n).padStart(3, "0")}`, T0 + n * 1000);
  const fullPage = (hi: number) => ({
    status: 200,
    body: { items: Array.from({ length: 20 }, (_, i) => dated(hi - i)) },
  });
  const empty = { status: 200, body: { items: [] } };
  const first = mockCtx([fullPage(120), fullPage(100), fullPage(80), fullPage(60), fullPage(40)]);
  const out1 = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  assertEquals(first.calls.length, 5);
  assertEquals(out1.events.length, 100);
  const s1 = out1.nextState as { cursor: number; drain?: { before: number; end: number } };
  assertEquals(s1.cursor, T0); // not advanced: the window is not drained
  assertEquals(s1.drain, { after: T0 - 120_000, before: T0 + 21_001, end: T0 + 300_000 });
  assertEquals(new URL(first.calls[1].url).searchParams.get("before"), String(T0 + 101_001));
  const second = mockCtx([fullPage(20), empty]);
  const out2 = await trigger.poll!({ ...input, state: out1.nextState }, second.ctx);
  assertEquals(new URL(second.calls[0].url).searchParams.get("before"), String(T0 + 21_001));
  assertEquals(out2.events.length, 20);
  const all = [...out1.events, ...out2.events].map((e) => (e as { _id: string })._id);
  assertEquals(new Set(all).size, 120);
  const s2 = out2.nextState as { cursor: number; drain?: unknown };
  assertEquals(s2.cursor, T0 + 300_000);
  assertEquals(s2.drain, undefined);
});
