import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newAlert from "../../triggers/new-alert.ts";
import newOrUpdatedAlert from "../../triggers/new-or-updated-alert.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const T0 = Date.parse("2026-11-10T10:00:00Z");
const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

const CASES = [
  { name: "new-alert", trigger: newAlert, field: "created_at", filter: "filter[created_at][gte]" },
  {
    name: "new-or-updated-alert",
    trigger: newOrUpdatedAlert,
    field: "updated_at",
    filter: "filter[updated_at][gte]",
  },
] as const;

for (const c of CASES) {
  describe(c.name, () => {
    const alert = (id: string, stamp = "2026-11-10T10:03:00Z") => ({
      id,
      type: "alerts",
      [c.field]: stamp,
    });
    const reply = (items: unknown[], next: number | null = null) => ({
      body: {
        data: items.map((a) => {
          const { id, type, ...attributes } = a as Record<string, unknown>;
          return { id, type, attributes };
        }),
        meta: { next_page: next },
      },
    });

    test("seeds, emits only the new alert, retries, sends the literal filtered request", async () => {
      clock.now = () => T0;
      const seed = mockCtx([reply([alert("a1")])]);
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
      assert.deepEqual(req(seed.calls[0]), {
        method: "GET",
        path: "/v1/alerts",
        query: { [c.filter]: "2026-11-10T09:58:00Z", "page[number]": "1", "page[size]": "100" },
      });

      clock.now = () => T0 + 300_000;
      const page = [alert("a2", "2026-11-10T10:04:00Z")];
      const first = mockCtx([reply(page)]);
      const out = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), mockCtx([reply(page)]).ctx);
      assert.deepEqual(out.events, page);
      assert.deepEqual(retry, out);
      assert.deepEqual(req(first.calls[0]), {
        method: "GET",
        path: "/v1/alerts",
        query: { [c.filter]: "2026-11-10T09:58:00Z", "page[number]": "1", "page[size]": "100" },
      });
    });

    // Brief 9.8: a window of maxPages + 1 full pages is drained over successive checks.
    test("drains a window of maxPages + 1 full pages: each item once, cursor moves after", async () => {
      const SIZE = 100;
      const stamp = "2026-11-10T10:03:00Z";
      const full = (n: number) => {
        const items = Array.from({ length: SIZE }, (_, i) => alert(`p${n}-${i}`, stamp));
        return reply(items, n < 3 ? n + 2 : null);
      };
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([reply([])]).ctx);

      clock.now = () => T0 + 300_000;
      const first = mockCtx([full(0), full(1), full(2)]);
      const one = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      assert.equal(first.calls.length, 3);
      assert.equal(one.events.length, SIZE * 3);
      assert.equal((one.nextState as { cursor: number }).cursor, T0);

      clock.now = () => T0 + 600_000;
      const second = mockCtx([full(3)]);
      const two = await c.trigger.poll!(input(one.nextState), second.ctx);
      assert.deepEqual(req(second.calls[0]), {
        method: "GET",
        path: "/v1/alerts",
        query: { [c.filter]: "2026-11-10T09:58:00Z", "page[number]": "4", "page[size]": "100" },
      });
      assert.equal(two.events.length, SIZE);
      assert.equal((two.nextState as { cursor: number }).cursor, T0 + 300_000);
      const all = [...one.events, ...two.events].map((e) => JSON.stringify(e));
      assert.equal(new Set(all).size, SIZE * 4);
    });

    // Brief 9.9: nothing that existed before the seed is ever emitted later.
    test("never emits a record older than the seed, however many pages the window holds", async () => {
      const SIZE = 100;
      const old = "2026-11-10T08:00:00Z";
      const oldPage = (n: number) =>
        reply(
          Array.from({ length: SIZE }, (_, i) => alert(`o${n}-${i}`, old)),
          n < 3 ? n + 2 : null,
        );
      clock.now = () => T0;
      const seeded = await c.trigger.poll!(input({}), mockCtx([reply([])]).ctx);

      clock.now = () => T0 + 300_000;
      const a = await c.trigger.poll!(
        input(seeded.nextState),
        mockCtx([oldPage(0), oldPage(1), oldPage(2)]).ctx,
      );
      assert.deepEqual(a.events, []);
      clock.now = () => T0 + 600_000;
      const b = await c.trigger.poll!(input(a.nextState), mockCtx([oldPage(3)]).ctx);
      assert.deepEqual(b.events, []);
      clock.now = () => T0 + 900_000;
      const fresh = alert("fresh", "2026-11-10T10:12:00Z");
      const d = await c.trigger.poll!(input(b.nextState), mockCtx([reply([fresh])]).ctx);
      assert.deepEqual(d.events, [fresh]);
    });
  });
}

test("new-or-updated-alert: an edited alert is a new event", async () => {
  const one = (stamp: string) => ({
    body: { data: [{ id: "a1", type: "alerts", attributes: { updated_at: stamp } }] },
  });
  clock.now = () => T0;
  const seeded = await newOrUpdatedAlert.poll!(
    input({}),
    mockCtx([one("2026-11-10T10:00:00Z")]).ctx,
  );
  clock.now = () => T0 + 300_000;
  const same = await newOrUpdatedAlert.poll!(
    input(seeded.nextState),
    mockCtx([one("2026-11-10T10:00:00Z")]).ctx,
  );
  assert.deepEqual(same.events, []);
  const edited = await newOrUpdatedAlert.poll!(
    input(seeded.nextState),
    mockCtx([one("2026-11-10T10:04:00Z")]).ctx,
  );
  assert.deepEqual(edited.events, [{
    id: "a1",
    type: "alerts",
    updated_at: "2026-11-10T10:04:00Z",
  }]);
});
