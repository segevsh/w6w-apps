import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-calendar.ts";
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
const cal = (id: string) => ({
  id,
  platform: "google_calendar",
  status: "connected",
  created_at: "2026-11-10T09:59:00Z",
});
const reply = (items: unknown[]) => ({ body: { next: null, previous: null, results: items } });

test("new-calendar seeds, emits, retries, and sends the literal since-filtered request", async () => {
  clock.now = () => T0;
  const seed = mockCtx([reply([cal("c1")])]);
  const seeded = await trigger.poll!(input({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(req(seed.calls[0]), {
    method: "GET",
    url: "https://us-west-2.recall.ai/api/v2/calendars/",
    query: { created_at__gte: "2026-11-10T09:58:00Z" },
  });

  clock.now = () => T0 + 300_000;
  const page = [cal("c2"), cal("c1")];
  const run = () => mockCtx([reply(page)]);
  const first = run();
  const out = await trigger.poll!(input(seeded.nextState), first.ctx);
  const retry = await trigger.poll!(input(seeded.nextState), run().ctx);
  assertEquals(out.events, [cal("c2")]);
  assertEquals(retry, out);
  assertEquals(req(first.calls[0]), {
    method: "GET",
    url: "https://us-west-2.recall.ai/api/v2/calendars/",
    query: { created_at__gte: "2026-11-10T09:58:00Z" },
  });
});

test("new-calendar skips an already seen record", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(input({}), mockCtx([reply([cal("c1")])]).ctx);
  clock.now = () => T0 + 300_000;
  const out = await trigger.poll!(input(seeded.nextState), mockCtx([reply([cal("c1")])]).ctx);
  assertEquals(out.events, []);
});

// Brief 9.8: a window holding maxPages + 1 full pages is drained over successive checks.
test("new-calendar drains a window of maxPages + 1 full pages: every item once, cursor moves after the drain", async () => {
  const SIZE = 100;
  const item = (n: number, i: number) => ({
    id: `c${n}-${i}`,
    platform: "google_calendar",
    status: "connected",
    created_at: "2026-11-10T09:59:00Z",
  });
  const pageReply = (n: number) => {
    const items = Array.from({ length: SIZE }, (_, i) => item(n, i));
    const more = n < 3;
    return {
      body: {
        next: more ? `https://us-east-1.recall.ai/api/v2/calendars/?cursor=c${n + 1}` : null,
        previous: null,
        results: items,
      },
    };
  };
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    input({}),
    mockCtx([{ body: { next: null, previous: null, results: [] } }]).ctx,
  );

  clock.now = () => T0 + 300_000;
  const first = mockCtx([pageReply(0), pageReply(1), pageReply(2)]);
  const one = await trigger.poll!(input(seeded.nextState), first.ctx);
  const s1 = one.nextState as { cursor: number; resume?: unknown };
  assertEquals(first.calls.length, 3);
  assertEquals(one.events.length, SIZE * 3);
  assertEquals(s1.cursor, T0);
  assertEquals(s1.resume !== undefined, true);

  clock.now = () => T0 + 600_000;
  const second = mockCtx([pageReply(3)]);
  const two = await trigger.poll!(input(one.nextState), second.ctx);
  const s2 = two.nextState as { cursor: number; resume?: unknown };
  assertEquals(second.calls.length, 1);
  assertEquals(req(second.calls[0]), {
    method: "GET",
    url: "https://us-west-2.recall.ai/api/v2/calendars/",
    query: { created_at__gte: "2026-11-10T09:58:00Z", cursor: "c3" },
  });
  assertEquals(two.events.length, SIZE);
  assertEquals(s2.cursor, T0 + 300_000);
  assertEquals(s2.resume, undefined);

  const all = [...one.events, ...two.events].map((e) => JSON.stringify(e));
  assertEquals(new Set(all).size, SIZE * 4);
  assertEquals(all.length, SIZE * 4);
});
