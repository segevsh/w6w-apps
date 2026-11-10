import { describe, test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCharge from "../../triggers/new-charge.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newFailedCharge from "../../triggers/new-failed-charge.ts";
import newProduct from "../../triggers/new-product.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import subscriptionStatusChanged from "../../triggers/subscription-status-changed.ts";

const T0 = 1_794_182_400_000; // 2026-11-09T00:00:00Z
const WINDOW = "created_at_min=2026-11-08T23%3A58%3A00.000Z";

interface Case {
  trigger: TriggerDefinition;
  /** Literal endpoint of the wrapped list action (no query). */
  endpoint: string;
  stamp: string;
  params: Record<string, unknown>;
  paged: boolean;
}
const cases: Case[] = [
  {
    trigger: newCharge,
    endpoint: "https://api.samcart.com/v1/charges",
    stamp: "created_at",
    params: {},
    paged: true,
  },
  {
    trigger: newCustomer,
    endpoint: "https://api.samcart.com/v1/customers",
    stamp: "created_at",
    params: {},
    paged: true,
  },
  {
    trigger: newFailedCharge,
    endpoint: "https://api.samcart.com/v1/failed-charges",
    stamp: "created_at",
    params: {},
    paged: true,
  },
  {
    trigger: newProduct,
    endpoint: "https://api.samcart.com/v1/products",
    stamp: "created_at",
    params: {},
    paged: true,
  },
  {
    trigger: newSubscription,
    endpoint: "https://api.samcart.com/v1/subscriptions",
    stamp: "created_at",
    params: {},
    paged: true,
  },
  {
    trigger: subscriptionStatusChanged,
    endpoint: "https://api.samcart.com/v1/subscriptions/77/history",
    stamp: "change_date",
    params: { subscriptionId: 77 },
    paged: false,
  },
];

const body = (items: unknown[], nextOffset?: number, paged = true) =>
  paged
    ? {
      data: items,
      pagination: nextOffset === undefined
        ? { next: null, prev: null }
        : { next: `https://api.samcart.com/v1/x?offset=${nextOffset}&limit=100`, prev: null },
    }
    : items;

for (const c of cases) {
  const key = c.trigger.key;
  const rec = (id: number, stamp = "2026-11-09 00:06:00") => ({ id, [c.stamp]: stamp });
  const poll = (state: unknown, responses: Array<{ body: unknown }>) => {
    const m = mockCtx(responses);
    return c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx).then((r) => ({
      r,
      calls: m.calls,
    }));
  };
  const ids = (r: { events: unknown[] }) => r.events.map((e) => (e as { id: number }).id);
  const tail = c.paged ? "&limit=100" : "";

  describe(key, () => {
    test("declares output and sample, and is a poll trigger without onSubscribe", () => {
      assertEquals(c.trigger.output!.length > 0, true);
      assertEquals(c.trigger.sample !== undefined, true);
      assertEquals(typeof c.trigger.poll, "function");
      assertEquals((c.trigger as { onSubscribe?: unknown }).onSubscribe, undefined);
    });

    test("seeds with no events, emits a new record, retries identically, requests the literal page", async () => {
      clock.now = () => T0;
      const seeded = await poll({}, [{
        body: body([rec(1, "2026-11-08 23:59:00")], undefined, c.paged),
      }]);
      assertEquals(seeded.r.events, []);
      assertEquals(seeded.calls[0].method, "GET");
      assertEquals(seeded.calls[0].url, `${c.endpoint}?${WINDOW}${tail}`);
      clock.now = () => T0 + 300_000;
      const response = { body: body([rec(2), rec(1, "2026-11-08 23:59:00")], undefined, c.paged) };
      const first = await poll(seeded.r.nextState, [response]);
      const retry = await poll(seeded.r.nextState, [response]);
      assertEquals(first.r.events, [rec(2)]);
      assertEquals(retry.r, first.r);
      assertEquals(
        first.calls[0].url,
        `${c.endpoint}?created_at_min=2026-11-08T23%3A58%3A00.000Z${tail}`,
      );
    });

    test("an unchanged record is not emitted twice", async () => {
      clock.now = () => T0;
      const seeded = await poll({}, [{ body: body([], undefined, c.paged) }]);
      clock.now = () => T0 + 300_000;
      const first = await poll(seeded.r.nextState, [{ body: body([rec(2)], undefined, c.paged) }]);
      clock.now = () => T0 + 600_000;
      const second = await poll(first.r.nextState, [{ body: body([rec(2)], undefined, c.paged) }]);
      assertEquals(ids(first.r), [2]);
      assertEquals(second.r.events, []);
      // The second window starts at the first check's start minus the 2-minute overlap.
      assertEquals(
        second.calls[0].url,
        `${c.endpoint}?created_at_min=2026-11-09T00%3A03%3A00.000Z${tail}`,
      );
    });

    test("never emits a record created before the seed, however many pages the window holds", async () => {
      const old = (id: number) => rec(id, "2026-11-08 23:59:00");
      clock.now = () => T0;
      const seeded = await poll({}, [{ body: body([old(1)], undefined, c.paged) }]);
      assertEquals(seeded.r.events, []);
      clock.now = () => T0 + 300_000;
      const c1 = await poll(seeded.r.nextState, [{
        body: body([old(2), old(3)], c.paged ? 3 : undefined, c.paged),
      }]);
      clock.now = () => T0 + 600_000;
      const c2 = await poll(c1.r.nextState, [{
        body: body([old(4), old(5)], c.paged ? 5 : undefined, c.paged),
      }]);
      assertEquals(c1.r.events, []);
      assertEquals(c2.r.events, []);
      clock.now = () => T0 + 900_000;
      const c3 = await poll(c2.r.nextState, [{
        body: body([rec(99), old(6)], undefined, c.paged),
      }]);
      assertEquals(ids(c3.r), [99]);
    });

    if (c.paged) {
      test("drains a window of more pages than one check reads, each record once, then moves the cursor", async () => {
        clock.now = () => T0;
        const seeded = await poll({}, [{ body: body([], undefined) }]);
        clock.now = () => T0 + 300_000;
        const c1 = await poll(seeded.r.nextState, [{ body: body([rec(3), rec(2)], 3) }]);
        clock.now = () => T0 + 600_000;
        const c2 = await poll(c1.r.nextState, [{ body: body([rec(5), rec(4)], 5) }]);
        clock.now = () => T0 + 900_000;
        const c3 = await poll(c2.r.nextState, [{ body: body([rec(6)]) }]);
        assertEquals(ids(c1.r), [2, 3]);
        assertEquals(ids(c2.r), [4, 5]);
        assertEquals(ids(c3.r), [6]);
        assertEquals(c1.calls[0].url, `${c.endpoint}?${WINDOW}&limit=100`);
        assertEquals(c2.calls[0].url, `${c.endpoint}?${WINDOW}&offset=3&limit=100`);
        assertEquals(c3.calls[0].url, `${c.endpoint}?${WINDOW}&offset=5&limit=100`);
        const state = (r: { nextState: unknown }) =>
          r.nextState as { cursor?: string; resume?: unknown };
        assertEquals(state(c1.r).cursor, state(seeded.r).cursor);
        assertEquals(state(c2.r).cursor, state(seeded.r).cursor);
        assertEquals(state(c3.r).cursor, "2026-11-09T00:05:00.000Z");
        assertEquals(state(c3.r).resume, undefined);
      });
    }

    test("reads a zone-less timestamp as UTC whatever the host time zone is", async () => {
      clock.now = () => T0;
      const seeded = await poll({}, [{ body: body([], undefined, c.paged) }]);
      clock.now = () => T0 + 300_000;
      // 23:59:00 UTC is before the 00:00:00Z seed; read as host-local on UTC-5 it would be 04:59Z.
      const next = await poll(seeded.r.nextState, [
        { body: body([rec(2), rec(1, "2026-11-08 23:59:00")], undefined, c.paged) },
      ]);
      assertEquals(ids(next.r), [2]);
    });
  });
}

describe("subscription-status-changed params", () => {
  test("requires the subscription id and puts it in the request path", () => {
    const p = subscriptionStatusChanged.params!.find((x) => x.key === "subscriptionId")!;
    assertEquals(p.required, true);
    assertEquals(p.type, "number");
  });
});
