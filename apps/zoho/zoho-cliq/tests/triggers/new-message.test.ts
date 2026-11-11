import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-message.ts";

// 2026-11-09T12:00:00Z
const SEED_AT = 1794225600000;
const input = { params: { chatId: "CT_1" }, subscriptionId: "sub-1" };
const BASE = "https://cliq.zoho.com/api/v2/chats/CT_1/messages";

const msg = (id: string, time: number) => ({
  id,
  time,
  type: "text",
  sender: { id: "1", name: "Scott" },
  content: { text: `Message ${id}` },
});
/** `count` messages, ascending, one every `stepMs`, starting at `startMs`. */
const run = (prefix: string, startMs: number, count: number, stepMs: number, from = 0) =>
  Array.from({ length: count }, (_, i) => msg(`${prefix}-${from + i}`, startMs + i * stepMs));
const page = (...pages: unknown[][]) => mockCtx(pages.map((data) => ({ body: { data } })));
const seededState = { v: 1, kind: "ids", seeded: true, ids: [], cursor: SEED_AT, floor: SEED_AT };

test("new-message: the first check reads nothing, emits nothing and records the seed time", async () => {
  clock.now = () => SEED_AT;
  const seed = page();
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls.length, 0);
  assertEquals(seeded.nextState, seededState);
});

test("new-message: sends fromtime = cursor - 120s and totime = now, emits the new message, retries idempotently", async () => {
  clock.now = () => SEED_AT + 300_000;
  const m = msg("new-1", SEED_AT + 120_000);
  const t = page([m]);
  const first = await trigger.poll!({ ...input, state: seededState }, t.ctx);
  assertEquals(t.calls.length, 1);
  assertEquals(t.calls[0].method, "GET");
  assertEquals(t.calls[0].url, `${BASE}?fromtime=1794225480000&totime=1794225900000&limit=100`);
  assertEquals(first.events, [m]);
  assertEquals((first.nextState as { cursor?: number }).cursor, SEED_AT + 300_000);

  const retry = await trigger.poll!({ ...input, state: seededState }, page([m]).ctx);
  assertEquals(retry, first);

  clock.now = () => SEED_AT + 600_000;
  const again = await trigger.poll!({ ...input, state: first.nextState }, page([m]).ctx);
  assertEquals(again.events, []);
});

test("new-message: a message stamped before the seed never fires, even when the window is longer than the page cap", async () => {
  clock.now = () => SEED_AT + 300_000;
  const old = run("old", SEED_AT - 100_000, 300, 100);
  const m = page(old.slice(0, 100), old.slice(100, 200), old.slice(200));
  const r1 = await trigger.poll!({ ...input, state: seededState }, m.ctx);
  assertEquals(m.calls.length, 3);
  assertEquals(r1.events, []);
  const s1 = r1.nextState as { resume?: unknown; cursor: number };
  assertEquals(s1.cursor, SEED_AT);
  assertEquals(s1.resume, {
    from: SEED_AT - 100_000 + 299 * 100,
    to: SEED_AT + 300_000,
    startedAt: SEED_AT + 300_000,
  });

  clock.now = () => SEED_AT + 600_000;
  const fresh = msg("fresh-1", SEED_AT + 400_000);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, page([old[299], fresh]).ctx);
  assertEquals(r2.events, [fresh]);
  assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);
  assertEquals((r2.nextState as { cursor: number }).cursor, SEED_AT + 300_000);
});

test("new-message: a window longer than the page cap is drained across checks, none twice, then the cursor advances", async () => {
  clock.now = () => SEED_AT + 300_000;
  const all = run("new", SEED_AT + 1000, 300, 1000);
  const c1 = page(all.slice(0, 100), all.slice(100, 200), all.slice(200));
  const r1 = await trigger.poll!({ ...input, state: seededState }, c1.ctx);
  assertEquals(c1.calls.map((c) => c.url), [
    `${BASE}?fromtime=1794225480000&totime=1794225900000&limit=100`,
    `${BASE}?fromtime=1794225700000&totime=1794225900000&limit=100`,
    `${BASE}?fromtime=1794225800000&totime=1794225900000&limit=100`,
  ]);
  assertEquals(r1.events.length, 300);
  const s1 = r1.nextState as { cursor: number; resume?: unknown };
  assertEquals(s1.cursor, SEED_AT); // not advanced: the window is not drained
  assertEquals(s1.resume, {
    from: SEED_AT + 300_000,
    to: SEED_AT + 300_000,
    startedAt: SEED_AT + 300_000,
  });

  clock.now = () => SEED_AT + 600_000;
  const extra = msg("new-late", SEED_AT + 300_000);
  const c2 = page([all[299], extra]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(c2.calls[0].url, `${BASE}?fromtime=1794225900000&totime=1794225900000&limit=100`);
  assertEquals(r2.events, [extra]);
  assertEquals((r2.nextState as { cursor: number }).cursor, SEED_AT + 300_000);
  assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);

  const ids = [...r1.events, ...r2.events].map((e) => (e as { id: string }).id);
  assertEquals(ids.length, 301);
  assertEquals(new Set(ids).size, 301);
});

test("new-message: a full page returned newest-first continues downwards from the oldest message seen", async () => {
  clock.now = () => SEED_AT + 300_000;
  const desc = run("d", SEED_AT + 1000, 100, 1000).reverse();
  const t = page(desc, []);
  const r = await trigger.poll!({ ...input, state: seededState }, t.ctx);
  assertEquals(t.calls[1].url, `${BASE}?fromtime=1794225480000&totime=1794225601000&limit=100`);
  assertEquals(r.events.length, 100);
});
