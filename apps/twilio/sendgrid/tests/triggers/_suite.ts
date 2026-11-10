import { test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";

/** 2026-11-09T00:00:00Z */
export const T0 = 1_794_182_400_000;

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19) + "Z";

/**
 * The §5 / §9.8 / §9.9 cases shared by the SendGrid contact triggers. `field` is the SGQL field
 * the trigger filters on (`created_at` or `updated_at`); `eventId` is the expected event identity.
 */
export function contactSuite(
  name: string,
  trigger: TriggerDefinition,
  field: "created_at" | "updated_at",
  eventId: (c: { id: string; created_at: string; updated_at: string }) => string,
) {
  const contact = (n: number, ms = T0 + 30_000) => ({
    id: `c${n}`,
    email: `c${n}@example.test`,
    created_at: iso(ms),
    updated_at: iso(ms),
  });
  const res = (items: unknown[]) => ({ body: { result: items, _metadata: {} } });
  const poll = async (state: unknown, items: unknown[]) => {
    const m = mockCtx([res(items)]);
    const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    return { r, calls: m.calls };
  };
  const cur = (s: unknown) => (s as { cursor?: string }).cursor;
  const ids = (events: unknown[]) => events.map((e) => (e as { id: string }).id);
  const url = "https://api.sendgrid.com/v3/marketing/contacts/search";
  const body = `{"query":"${field} >= TIMESTAMP '2026-11-08T23:58:00Z'"}`;

  test(`${name}: seeds, emits only new contacts, retries idempotently, literal request`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, [contact(1, T0 - 10_000)]);
    assertEquals(seeded.r.events, []);
    assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls[0].method, "POST");
    assertEquals(seeded.calls[0].url, url);
    assertEquals(seeded.calls[0].body, body);
    const page = [contact(2), contact(1, T0 - 10_000)];
    const first = await poll(seeded.r.nextState, page);
    const retry = await poll(seeded.r.nextState, page);
    assertEquals(first.r.events.length, 1);
    assertEquals(ids(first.r.events), ["c2"]);
    assertEquals(eventId(first.r.events[0] as ReturnType<typeof contact>), eventId(contact(2)));
    assertEquals(retry.r, first.r);
  });

  test(`${name}: re-reads the cursor minus the overlap on the next check`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, []);
    assertEquals(cur(seeded.r.nextState), "2026-11-09T00:00:00.000Z");
    clock.now = () => T0 + 300_000;
    const next = await poll(seeded.r.nextState, []);
    assertEquals(next.calls[0].body, body);
    assertEquals(cur(next.r.nextState), "2026-11-09T00:05:00.000Z");
  });

  test(`${name}: a window larger than one check's cap drains across checks, each once`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, []);
    const all = Array.from({ length: 1001 }, (_, i) => contact(i + 1, T0 + 10_000 + i * 1000));
    clock.now = () => T0 + 300_000;
    const c1 = await poll(seeded.r.nextState, all);
    assertEquals(c1.r.events.length, 1000);
    // The cursor stays put while the window still holds undelivered contacts.
    assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
    clock.now = () => T0 + 600_000;
    const c2 = await poll(c1.r.nextState, all);
    assertEquals(c2.r.events.length, 1);
    assertEquals(new Set([...ids(c1.r.events), ...ids(c2.r.events)]).size, 1001);
    // Drained: the cursor moves to the first check of that window.
    assertEquals(cur(c2.r.nextState), "2026-11-09T00:05:00.000Z");
    clock.now = () => T0 + 900_000;
    const c3 = await poll(c2.r.nextState, all);
    assertEquals(c3.r.events, []);
  });

  test(`${name}: never emits a contact stamped before the seed, however large the window`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, []);
    assertEquals(seeded.r.events, []);
    const old = Array.from({ length: 1200 }, (_, i) => contact(i + 1, T0 - 600_000 + i));
    clock.now = () => T0 + 300_000;
    const c1 = await poll(seeded.r.nextState, old);
    clock.now = () => T0 + 600_000;
    const c2 = await poll(c1.r.nextState, old);
    assertEquals(c1.r.events, []);
    assertEquals(c2.r.events, []);
    clock.now = () => T0 + 900_000;
    const fresh = contact(5000, T0 + 700_000);
    const c3 = await poll(c2.r.nextState, [...old, fresh]);
    assertEquals(c3.r.events, [fresh]);
  });
}
