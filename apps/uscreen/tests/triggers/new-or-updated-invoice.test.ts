import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-invoice.ts";
import { clock } from "../../lib/triggers.ts";
import { idsOf, sinceSuite, T0 } from "./_suite.ts";

const base = "https://uscreen.io/publisher_api/v1/invoices";
sinceSuite("new-or-updated-invoice", trigger, base, "updated_at");

const inv = (id: number, updated: number) => ({
  id,
  created_at: T0 / 1000 - 600,
  updated_at: updated,
});
const res = (items: unknown[]) => ({
  body: items,
  headers: { "content-type": "application/json" },
});
const poll = async (state: unknown, items: unknown[]) => {
  const m = mockCtx([res(items)]);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-or-updated-invoice: an edited invoice is a new event; identity is id:updated_at", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, []);
  const created = T0 / 1000 + 30;
  clock.now = () => T0 + 300_000;
  const c1 = await poll(seeded.r.nextState, [inv(7, created)]);
  assertEquals(idsOf(c1.r.events), [7]);
  // Same invoice edited later, filter literal asks for the updated_at stamp.
  clock.now = () => T0 + 600_000;
  const edited = inv(7, created + 120);
  const c2 = await poll(c1.r.nextState, [edited, inv(7, created)]);
  assertEquals(c2.r.events, [edited]);
  assertEquals(
    c2.calls[0].url,
    `${base}?from=2026-11-09T00%3A03%3A00.000Z&date_field=updated_at&page=1`,
  );
  // Unchanged invoice is not re-emitted.
  clock.now = () => T0 + 900_000;
  const c3 = await poll(c2.r.nextState, [edited]);
  assertEquals(c3.r.events, []);
});

test("new-or-updated-invoice: an invoice created before the seed but edited after it is emitted", async () => {
  clock.now = () => T0;
  const seeded = await poll({}, []);
  clock.now = () => T0 + 300_000;
  const edited = inv(9, T0 / 1000 + 100);
  const c1 = await poll(seeded.r.nextState, [edited]);
  assertEquals(c1.r.events, [edited]);
});
