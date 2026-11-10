import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newCompany from "../../triggers/new-company.ts";
import { clock } from "../../lib/triggers.ts";

// Brief 9.8 (a window longer than maxPages is resumed) and 9.9 (the seed floor) for both triggers.
const PAGE = 100;
const MAX_PAGES = 3;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (ms: number): void => {
  clock.now = () => ms;
};

const kinds = [
  {
    name: "new-contact",
    trigger: newContact,
    idField: "contactId",
    path: "/api/client/v2/contacts",
  },
  {
    name: "new-company",
    trigger: newCompany,
    idField: "companyId",
    path: "/api/client/v2/companies",
  },
] satisfies Array<{ name: string; trigger: TriggerDefinition; idField: string; path: string }>;

for (const k of kinds) {
  describe(k.name, () => {
    const rec = (id: string, ms: number) => ({
      [k.idField]: id,
      researchedAt: iso(ms),
      createdAt: iso(ms),
    });
    const page = (items: unknown[]): MockResponse => ({ body: { success: true, data: items } });
    const full = (n: number, ms: number, last = false): MockResponse =>
      page(Array.from({ length: last ? 1 : PAGE }, (_, i) => rec(`n${n}-${i}`, ms)));
    const run = (state: unknown, responses: MockResponse[]) => {
      const m = mockCtx(responses);
      return k.trigger.poll!({ params: {}, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
    };
    const seed = async () => {
      at(T0);
      const seeded = await run({}, []);
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { floor?: number }).floor, T0);
      assert.equal(seeded.calls.length, 0);
      return seeded.nextState;
    };

    test("emits only a record saved after the seed, once, and sends the literal window request", async () => {
      const state = await seed();
      at(T0 + 300_000);
      const fresh = rec("fresh", T0 + 100_000);
      const responses = [page([fresh, rec("before", OLD)])];
      const out = await run(state, responses);
      assert.deepEqual(out.events, [fresh]);
      assert.deepEqual(await run(state, responses).then((r) => r.events), [fresh]);
      const url = new URL(out.calls[0].url);
      assert.deepEqual({
        method: out.calls[0].method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      }, {
        method: "GET",
        path: k.path,
        query: {
          startDate: "2026-11-10T00:28:00.000Z",
          endDate: "2026-11-10T00:35:00.000Z",
          page: "1",
          limit: "100",
        },
      });
    });

    test("records that predate the seed never fire, even over more than maxPages full pages", async () => {
      let state = await seed();
      at(T0 + 300_000);
      const r1 = await run(state, Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, OLD)));
      assert.equal(r1.calls.length, MAX_PAGES);
      assert.deepEqual(r1.events, []);
      state = r1.nextState;
      at(T0 + 600_000);
      const r2 = await run(state, [full(MAX_PAGES + 1, OLD, true)]);
      assert.deepEqual(r2.events, []);
      state = r2.nextState;
      at(T0 + 900_000);
      const fresh = rec("fresh", T0 + 400_000);
      const r3 = await run(state, [page([rec("old-1", OLD), fresh])]);
      assert.deepEqual(r3.events, [fresh]);
    });

    test("a window of maxPages + 1 pages is emitted once across checks and the cursor advances after the drain", async () => {
      const state = await seed();
      at(T0 + 300_000);
      const r1 = await run(
        state,
        Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, T0 + 100_000)),
      );
      assert.equal(r1.calls.length, MAX_PAGES);
      assert.equal(r1.events.length, MAX_PAGES * PAGE);
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assert.equal(n1.cursor, T0);
      assert.equal(n1.resume?.pos, MAX_PAGES + 1);
      at(T0 + 600_000);
      const r2 = await run(r1.nextState, [full(MAX_PAGES + 1, T0 + 100_000, true)]);
      // Continues from page 4 of the SAME window (endDate pinned to the window start), not from page 1.
      const q = Object.fromEntries(new URL(r2.calls[0].url).searchParams);
      assert.equal(q.page, String(MAX_PAGES + 1));
      assert.equal(q.endDate, iso(T0 + 300_000));
      assert.equal(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assert.equal(n2.cursor, T0 + 300_000);
      assert.equal(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
      assert.equal(new Set(all).size, MAX_PAGES * PAGE + 1);
    });
  });
}
