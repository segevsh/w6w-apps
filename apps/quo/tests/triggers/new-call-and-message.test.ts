import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCall from "../../triggers/new-call.ts";
import newMessage from "../../triggers/new-message.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T10:00:00Z");
const OLD = "2026-11-10T09:00:00Z";
const NEW = "2026-11-10T10:03:00Z";
const SIZE = 100;
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, url: u.origin + u.pathname, query: u.search };
};
const reply = (items: unknown[], next: string | null = null) => ({
  body: { data: items, totalItems: items.length, nextPageToken: next },
});

const cases = [
  {
    name: "new-call",
    trigger: newCall,
    params: { phoneNumberId: "PN1", participant: "+15555550100" },
    path: "https://api.quo.com/v1/calls",
    // Literal query: phoneNumberId, one participants entry, createdAfter = T0 - 120 s, maxResults.
    query: (extra = "") =>
      "?phoneNumberId=PN1&participants=%2B15555550100&createdAfter=2026-11-10T09%3A58%3A00Z&maxResults=100" +
      extra,
    mk: (id: string, createdAt: string) => ({ id, direction: "incoming", createdAt }),
  },
  {
    name: "new-message",
    trigger: newMessage,
    params: { phoneNumberId: "PN1", participants: ["+15555550100", "+15555550101"] },
    path: "https://api.quo.com/v1/messages",
    query: (extra = "") =>
      "?phoneNumberId=PN1&participants=%2B15555550100&participants=%2B15555550101&createdAfter=2026-11-10T09%3A58%3A00Z&maxResults=100" +
      extra,
    mk: (id: string, createdAt: string) => ({ id, text: "hi", createdAt }),
  },
];

for (const c of cases) {
  const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });
  describe(c.name, () => {
    test("seeds, emits the new item, retries identically, sends the literal request", async () => {
      clock.now = () => T0;
      const seed = mockCtx([reply([c.mk("A1", OLD)])]);
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(req(seed.calls[0]), { method: "GET", url: c.path, query: c.query() });

      clock.now = () => T0 + 300_000;
      const fresh = c.mk("A2", NEW);
      const run = () => mockCtx([reply([fresh, c.mk("A1", OLD)])]);
      const first = run();
      const out = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), run().ctx);
      assertEquals(out.events, [fresh]);
      assertEquals(retry, out);
      assertEquals(req(first.calls[0]), { method: "GET", url: c.path, query: c.query() });
    });

    test("drains a window of maxPages + 1 full pages: every item once, cursor moves after", async () => {
      const item = (n: number, i: number) => c.mk(`P${n}-${i}`, NEW);
      const page = (n: number) =>
        reply(Array.from({ length: SIZE }, (_, i) => item(n, i)), n < 3 ? `t${n + 1}` : null);
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([reply([])]).ctx);
      clock.now = () => T0 + 300_000;
      const one = await c.trigger.poll!(
        input(seeded.nextState),
        mockCtx([page(0), page(1), page(2)]).ctx,
      );
      assertEquals(one.events.length, SIZE * 3);
      assertEquals((one.nextState as { cursor: number }).cursor, T0);
      clock.now = () => T0 + 600_000;
      const second = mockCtx([page(3)]);
      const two = await c.trigger.poll!(input(one.nextState), second.ctx);
      assertEquals(req(second.calls[0]), {
        method: "GET",
        url: c.path,
        query: c.query("&pageToken=t3"),
      });
      assertEquals(two.events.length, SIZE);
      assertEquals((two.nextState as { cursor: number }).cursor, T0 + 300_000);
      assertEquals((two.nextState as { resume?: unknown }).resume, undefined);
      const all = [...one.events, ...two.events].map((e) => JSON.stringify(e));
      assertEquals(new Set(all).size, SIZE * 4);
    });

    test("never emits a pre-seed record (floor), then emits the one created after the seed", async () => {
      const old = (n: number) =>
        reply(
          Array.from({ length: SIZE }, (_, i) => c.mk(`o${n}-${i}`, OLD)),
          n < 3 ? `t${n + 1}` : null,
        );
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([reply([])]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      clock.now = () => T0 + 300_000;
      const one = await c.trigger.poll!(
        input(seeded.nextState),
        mockCtx([old(0), old(1), old(2)]).ctx,
      );
      assertEquals(one.events, []);
      clock.now = () => T0 + 600_000;
      const two = await c.trigger.poll!(input(one.nextState), mockCtx([old(3)]).ctx);
      assertEquals(two.events, []);
      clock.now = () => T0 + 900_000;
      const fresh = c.mk("fresh", NEW);
      const three = await c.trigger.poll!(input(two.nextState), mockCtx([reply([fresh])]).ctx);
      assertEquals(three.events, [fresh]);
    });
  });
}
