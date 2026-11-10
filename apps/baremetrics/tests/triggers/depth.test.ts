import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCharge from "../../triggers/new-charge.ts";
import newRefund from "../../triggers/new-refund.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import newPlan from "../../triggers/new-plan.ts";
import newGoal from "../../triggers/new-goal.ts";
import newSource from "../../triggers/new-source.ts";

const input = { params: { sourceId: "src1" }, subscriptionId: "sub-1" };
const T0 = Date.parse("2026-11-10T12:00:00Z");
const OLD = T0 / 1000 - 3600;
const MAX_PAGES = 5;
const PAGE = 200;
let seq = 0;
const meta = (more: boolean) => ({ pagination: { has_more: more, page: 0, per_page: PAGE } });
const run = (trigger: typeof newCharge, state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses);
  return trigger.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
};

describe("new-charge / new-refund (since-filter)", () => {
  for (
    const [name, trigger, listKey, path] of [
      ["new-charge", newCharge, "charges", "charges"],
      ["new-refund", newRefund, "refunds", "refunds"],
    ] as const
  ) {
    const rec = (created: number) => ({ oid: `${name}-${++seq}`, created });
    const page = (items: unknown[], more: boolean): MockResponse => ({
      body: { [listKey]: items, meta: meta(more) },
    });
    const full = (created: number, more = true): MockResponse =>
      page(Array.from({ length: PAGE }, () => rec(created)), more);
    const seed = async () => {
      clock.now = () => T0;
      const seeded = await run(trigger, {}, [page([rec(OLD)], false)]);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      assertEquals(seeded.calls[0].method, "GET");
      assertEquals(
        seeded.calls[0].url,
        `https://api.baremetrics.com/v1/src1/${path}?start=1794311880&per_page=200&page=0`,
      );
      return seeded.nextState;
    };

    test(`${name}: seeds, emits only the record created since, retries idempotently`, async () => {
      const state = await seed();
      clock.now = () => T0 + 300_000;
      const fresh = rec(T0 / 1000 + 100);
      const responses = [page([rec(OLD), fresh], false)];
      const first = await run(trigger, state, responses);
      const retry = await run(trigger, state, responses);
      assertEquals(first.events, [fresh]);
      assertEquals(retry.events, first.events);
      assertEquals(retry.nextState, first.nextState);
      assertEquals(
        first.calls[0].url,
        `https://api.baremetrics.com/v1/src1/${path}?start=1794311880&per_page=200&page=0`,
      );
    });

    test(`${name}: records older than the seed never fire, even over more than maxPages full pages`, async () => {
      let state = await seed();
      clock.now = () => T0 + 300_000;
      const r1 = await run(
        trigger,
        state,
        Array.from({ length: MAX_PAGES }, () => full(OLD)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events, []);
      state = r1.nextState;
      clock.now = () => T0 + 600_000;
      const r2 = await run(trigger, state, [page([rec(OLD)], false)]);
      assertEquals(r2.events, []);
      clock.now = () => T0 + 900_000;
      const fresh = rec(T0 / 1000 + 400);
      const r3 = await run(trigger, r2.nextState, [page([rec(OLD), fresh], false)]);
      assertEquals(r3.events, [fresh]);
    });

    test(`${name}: a window of maxPages + 1 pages is emitted once across checks, cursor advances after the drain`, async () => {
      const state = await seed();
      clock.now = () => T0 + 300_000;
      const created = T0 / 1000 + 100;
      const r1 = await run(trigger, state, Array.from({ length: MAX_PAGES }, () => full(created)));
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events.length, MAX_PAGES * PAGE);
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: number } };
      assertEquals(n1.cursor, T0);
      assertEquals(n1.resume?.pos, MAX_PAGES);
      clock.now = () => T0 + 600_000;
      const r2 = await run(trigger, r1.nextState, [page([rec(created)], false)]);
      assertEquals(
        r2.calls[0].url,
        `https://api.baremetrics.com/v1/src1/${path}?start=1794311880&per_page=200&page=5`,
      );
      assertEquals(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(n2.cursor, T0 + 300_000);
      assertEquals(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => (e as { oid: string }).oid);
      assertEquals(new Set(all).size, MAX_PAGES * PAGE + 1);
    });
  }
});

describe("new-subscription (newest first)", () => {
  const item = (oid: string) => ({ oid });
  test("seeds, emits only the new subscription, retries, requests order=desc", async () => {
    const seed = await run(newSubscription, {}, [{ body: { subscriptions: [item("a")] } }]);
    assertEquals(seed.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.baremetrics.com/v1/src1/subscriptions?order=desc&per_page=100&page=0",
    );
    const body = { subscriptions: [item("b"), item("a")] };
    const first = await run(newSubscription, seed.nextState, [{ body }]);
    const retry = await run(newSubscription, seed.nextState, [{ body }]);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry.events, first.events);
  });
});

describe("snapshot triggers (plans, goals, sources)", () => {
  const cases = [
    {
      name: "new-plan",
      trigger: newPlan,
      key: "plans",
      id: "oid",
      url: "https://api.baremetrics.com/v1/src1/plans?per_page=200&page=0",
    },
    {
      name: "new-goal",
      trigger: newGoal,
      key: "goals",
      id: "id",
      url: "https://api.baremetrics.com/v1/goals?per_page=200&page=0",
    },
    {
      name: "new-source",
      trigger: newSource,
      key: "sources",
      id: "id",
      url: "https://api.baremetrics.com/v1/sources",
    },
  ] as const;
  for (const c of cases) {
    test(`${c.name}: seeds, emits only the added record, ignores edits, retries idempotently`, async () => {
      const row = (id: string, name = id) => ({ [c.id]: id, name });
      const wrap = (rows: unknown[]) => ({ body: { [c.key]: rows, meta: meta(false) } });
      const seed = await run(c.trigger as typeof newCharge, {}, [wrap([row("a")])]);
      assertEquals(seed.events, []);
      assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const rows = [row("a", "renamed"), row("b")];
      const first = await run(c.trigger as typeof newCharge, seed.nextState, [wrap(rows)]);
      const retry = await run(c.trigger as typeof newCharge, seed.nextState, [wrap(rows)]);
      assertEquals(first.events, [row("b")]);
      assertEquals(retry.events, first.events);
    });
  }
});
