import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMessage from "../../triggers/new-message.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T12:00:00.000Z");
const T1 = T0 + 300_000;
const OLD = "2026-11-10T11:59:30.000Z"; // before the seed, inside the overlap window
const FRESH = "2026-11-10T12:03:00.000Z"; // after the seed, inside the next window
const ROOT = "https://api-app2.simpletexting.com/v2";
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const cursor = (r: unknown) => (next(r) as { cursor: number }).cursor;
const wrap = (content: unknown[], totalPages = 1) => ({
  body: { content, totalPages, totalElements: content.length },
});

const cases = [
  {
    name: "new-message",
    trigger: newMessage,
    params: { accountPhone: "8005551234", contactPhone: "8001234567" },
    // Literal request: window start = seed - 120 s, filter `since`, params passed through.
    url: (page: number) =>
      `${ROOT}/api/messages?page=${page}&size=100&accountPhone=8005551234&contactPhone=8001234567&since=2026-11-10T11%3A58%3A00.000Z`,
    mk: (id: string, at: string) => ({ id, text: "hi", timestamp: at }),
  },
  {
    name: "new-campaign",
    trigger: newCampaign,
    params: { accountPhone: "8005551234" },
    url: (page: number) =>
      `${ROOT}/api/campaigns?page=${page}&size=100&type=ALL&accountPhone=8005551234&startDateFrom=2026-11-10T11%3A58%3A00.000Z`,
    mk: (id: string, at: string) => ({ campaignId: id, title: "t", created: OLD, started: at }),
  },
];

for (const c of cases) {
  const input = (state: unknown) => ({ params: c.params, subscriptionId: "s", state }) as never;
  const seed = async () => {
    clock.now = () => T0;
    const ctx = mockCtx([]);
    const r = await c.trigger.poll!(input({}), ctx.ctx);
    return { r, calls: ctx.calls };
  };
  describe(c.name, () => {
    test("seeds without a request, emits the new record, retries identically, sends the literal request", async () => {
      const { r: seeded, calls } = await seed();
      assertEquals(events(seeded), []);
      assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
      assertEquals(calls.length, 0);
      clock.now = () => T1;
      const body = wrap([c.mk("fresh", FRESH), c.mk("old", OLD)]);
      const run = mockCtx([body]);
      const first = await c.trigger.poll!(input(next(seeded)), run.ctx);
      const retry = await c.trigger.poll!(input(next(seeded)), mockCtx([body]).ctx);
      assertEquals(events(first), [c.mk("fresh", FRESH)]);
      assertEquals(retry, first);
      assertEquals(cursor(first), T1);
      assertEquals(run.calls[0].method, "GET");
      assertEquals(run.calls[0].url, c.url(0));
    });

    test("a window longer than maxPages is resumed: every record once, then the cursor advances", async () => {
      const { r: seeded } = await seed();
      const pages = [0, 1, 2, 3].map((p) =>
        Array.from({ length: p < 3 ? 100 : 5 }, (_, i) => c.mk(`r${p}-${i}`, FRESH))
      );
      clock.now = () => T1;
      const a = await c.trigger.poll!(
        input(next(seeded)),
        mockCtx([wrap(pages[0], 4), wrap(pages[1], 4), wrap(pages[2], 4)]).ctx,
      );
      assertEquals(events(a).length, 300);
      assertEquals(cursor(a), T0);
      clock.now = () => T1 + 300_000;
      const second = mockCtx([wrap(pages[3], 4)]);
      const b = await c.trigger.poll!(input(next(a)), second.ctx);
      assertEquals(second.calls[0].url, c.url(3));
      assertEquals(events(b).length, 5);
      assertEquals(cursor(b), T1);
      assertEquals((next(b) as { resume?: unknown }).resume, undefined);
      const ids = [...events(a), ...events(b)].map((e) => JSON.stringify(e));
      assertEquals(new Set(ids).size, 305);
    });

    test("records from before the seed are never emitted (floor); one after it is", async () => {
      const { r: seeded } = await seed();
      const pre = [0, 1, 2, 3].map((p) =>
        Array.from({ length: 100 }, (_, i) => c.mk(`pre${p}-${i}`, OLD))
      );
      let state = next(seeded);
      let emitted = 0;
      let now = T1;
      for (
        const responses of [
          [wrap(pre[0], 4), wrap(pre[1], 4), wrap(pre[2], 4)],
          [wrap(pre[3], 4)],
        ]
      ) {
        clock.now = () => now;
        const r = await c.trigger.poll!(input(state), mockCtx(responses).ctx);
        emitted += events(r).length;
        state = next(r);
        now += 300_000;
      }
      assertEquals(emitted, 0);
      clock.now = () => now;
      const post = c.mk("post-1", "2026-11-10T12:12:00.000Z");
      const r = await c.trigger.poll!(input(state), mockCtx([wrap([post])]).ctx);
      assertEquals(events(r), [post]);
    });
  });
}
