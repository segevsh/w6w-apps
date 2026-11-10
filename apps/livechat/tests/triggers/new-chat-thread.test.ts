import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import trigger from "../../triggers/new-chat-thread.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.UTC(2026, 10, 9, 12, 0, 0);
const input = { params: {}, subscriptionId: "sub-1" };
const chat = (id: string, thread: string) => ({ id, thread: { id: thread }, users: [] });
const page = (...cs: Array<ReturnType<typeof chat>>) => ({
  body: { chats: cs, found_chats: cs.length },
});

test("new-chat-thread: seeds, emits the new thread, retries, and requests the dated desc window", async () => {
  clock.now = () => T0;
  const seed = mockCtx([page(chat("C1", "T1"))]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(pathOf(seed.calls[0].url), "/v3.6/agent/action/list_archives");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    filters: { from: "2026-11-09T11:58:00.000000+00:00" },
    limit: 100,
    sort_order: "desc",
  });
  clock.now = () => T0 + 300_000;
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(chat("C2", "T2"), chat("C1", "T1"))]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [chat("C2", "T2")]);
  assertEquals(await run(), first);
});

test("new-chat-thread: a second thread of a known chat is a new event", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([page(chat("C1", "T1"))]).ctx,
  );
  const out = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(chat("C1", "T2"), chat("C1", "T1"))]).ctx,
  );
  assertEquals(out.events, [chat("C1", "T2")]);
});

test("new-chat-thread: a window of maxPages+1 full pages drains across checks, none twice, cursor advances after", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([page(chat("seed", "s"))]).ctx,
  );
  clock.now = () => T0 + 300_000;
  const full = (hi: number, next?: string) => ({
    body: {
      chats: Array.from({ length: 100 }, (_, i) => chat(`C${hi - i}`, "T")),
      ...(next ? { next_page_id: next } : {}),
    },
  });
  const first = mockCtx([
    full(600, "p2"),
    full(500, "p3"),
    full(400, "p4"),
    full(300, "p5"),
    full(200, "p6"),
  ]);
  const out1 = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  assertEquals(first.calls.length, 5);
  assertEquals(JSON.parse(first.calls[1].body!), { page_id: "p2" });
  assertEquals(out1.events.length, 500);
  const s1 = out1.nextState as { cursor: number; drain?: { pageId: string; end: number } };
  assertEquals(s1.cursor, T0);
  assertEquals(s1.drain, { pageId: "p6", end: T0 + 300_000 });
  clock.now = () => T0 + 600_000;
  const second = mockCtx([full(100)]);
  const out2 = await trigger.poll!({ ...input, state: out1.nextState }, second.ctx);
  assertEquals(JSON.parse(second.calls[0].body!), { page_id: "p6" });
  assertEquals(out2.events.length, 100);
  const all = [...out1.events, ...out2.events].map((c) => (c as { id: string }).id);
  assertEquals(new Set(all).size, 600);
  const s2 = out2.nextState as { cursor: number; drain?: unknown };
  assertEquals(s2.cursor, T0 + 300_000); // the drained window's end, not the later check time
  assertEquals(s2.drain, undefined);
});
