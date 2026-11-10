import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-incident.ts";
import { clock } from "../../lib/since.ts";
// Re-serve: a vendor whose date filter is a whole day hands back the same window on every check.
// Every record must still be emitted exactly once across 14 checks, and a resumed check must
// request the persisted page, not page 1.
const input = { params: {}, subscriptionId: "sub-1" };
const MAX_PAGES = 10;
const PAGE = 50;
const N = 1100;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const CHECKS = 14;
const realNow = Date.now;
const at = (ms: number): void => {
  clock.now = () => ms;
};
const rec = (id: number, at: number, stamped: boolean) => ({
  id,
  type: "incident",
  attributes: { name: "Homepage", ...(stamped ? { started_at: new Date(at).toISOString() } : {}) },
});
const pageNumber = (call: { url: string; body: string | null }): number =>
  Number(new URL(call.url).searchParams.get("page"));
const serve = (window: unknown[], from: number): MockResponse[] =>
  Array.from({ length: MAX_PAGES }, (_, i) => {
    const page = from + i;
    const items = window.slice((page - 1) * PAGE, page * PAGE);
    return {
      body: {
        data: items,
        pagination: {
          next: page * PAGE < N
            ? "https://uptime.betterstack.com/api/v2/incidents?page=" + (page + 1)
            : null,
        },
      },
    };
  });
const idOf = (e: unknown): string => String((e as { id: number }).id);

for (const stamped of [true, false]) {
  test(`new-incident: a re-served window of ${N} is emitted once over ${CHECKS} checks (${stamped ? "timed" : "untimed"} stamps)`, async () => {
    try {
      let seq = 0;
      const window = Array.from({ length: N }, () => rec(++seq, T0 + 100_000, stamped));
      at(T0);
      const seed = await trigger.poll!(
        { ...input, state: {} },
        mockCtx([{ body: { data: [], pagination: { next: null } } }]).ctx,
      );
      assertEquals(seed.events, []);
      let state: unknown = seed.nextState;
      const emitted: string[] = [];
      for (let k = 1; k <= CHECKS; k++) {
        at(T0 + k * 300_000);
        const from = (state as { resume?: { pos?: number } }).resume?.pos ?? 1;
        const m = mockCtx(serve(window, from));
        const r = await trigger.poll!({ ...input, state }, m.ctx);
        assertEquals(pageNumber(m.calls[0]), from);
        for (const e of r.events) emitted.push(idOf(e));
        state = r.nextState;
      }
      assertEquals(emitted.length, N);
      assertEquals(new Set(emitted).size, N);
    } finally {
      Date.now = realNow;
    }
  });
}
