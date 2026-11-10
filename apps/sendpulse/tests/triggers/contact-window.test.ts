import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newOrUpdatedContact from "../../triggers/new-or-updated-contact.ts";
import { clock } from "../../lib/triggers.ts";

// Brief 9.1 b + 9.2, 9.8 (resume past maxPages) and 9.9 (seed floor) for the contact triggers.
const input = { params: {}, subscriptionId: "sub-1" };
const MAX_PAGES = 5;
const PAGE = 100;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
let seq = 0;
const rec = (created: number, updated = created) => ({
  id: ++seq,
  firstName: `c${seq}`,
  createdAt: iso(created),
  updatedAt: iso(updated),
});
const page = (list: unknown[], total: number): MockResponse => ({
  body: { success: true, data: { list, total } },
});
const full = (total: number, ts: number, last = false): MockResponse =>
  page(Array.from({ length: last ? 1 : PAGE }, () => rec(ts)), total);
const realNow = clock.now;
const at = (ms: number): void => {
  clock.now = () => ms;
};
type Trig = typeof newContact;
const run = (t: Trig, state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses);
  return t.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
};
const seed = async (t: Trig) => {
  at(T0);
  const s = await run(t, {}, []);
  assertEquals(s.events, []);
  assertEquals(s.calls.length, 0);
  assertEquals((s.nextState as { floor?: number }).floor, T0);
  return s.nextState;
};

for (const [t, filter] of [[newContact, "from"], [newOrUpdatedContact, "updateFrom"]] as const) {
  test(`${t.key}: seeds, emits the new contact, is idempotent, sends the literal day filter`, async () => {
    try {
      const state = await seed(t);
      at(T0 + 300_000);
      const fresh = rec(T0 + 100_000);
      const r1 = await run(t, state, [page([rec(OLD), fresh], 2)]);
      const r2 = await run(t, state, [page([rec(OLD), fresh], 2)]);
      assertEquals(r1.events, [fresh]);
      assertEquals(r2.events, r1.events);
      assertEquals(r1.calls[0].method, "POST");
      assertEquals(r1.calls[0].url, "https://api.sendpulse.com/crm/v1/contacts/get-list");
      assertEquals(JSON.parse(r1.calls[0].body ?? ""), {
        limit: 100,
        offset: 0,
        [filter]: "2026-11-10",
      });
    } finally {
      clock.now = realNow;
    }
  });

  test(`${t.key}: contacts that predate the seed never fire, even over more than maxPages pages`, async () => {
    try {
      let state = await seed(t);
      const total = (MAX_PAGES + 1) * PAGE;
      at(T0 + 300_000);
      const r1 = await run(
        t,
        state,
        Array.from({ length: MAX_PAGES }, () => full(total, OLD)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events, []);
      state = r1.nextState;
      at(T0 + 600_000);
      const r2 = await run(t, state, [full(total, OLD)]);
      assertEquals(r2.events, []);
      state = r2.nextState;
      at(T0 + 900_000);
      const fresh = rec(T0 + 400_000);
      const r3 = await run(t, state, [page([rec(OLD), fresh], 2)]);
      assertEquals(r3.events, [fresh]);
    } finally {
      clock.now = realNow;
    }
  });

  test(`${t.key}: a window of maxPages + 1 pages is emitted once across checks and the cursor advances after the drain`, async () => {
    try {
      const state = await seed(t);
      const total = MAX_PAGES * PAGE + 1;
      const ts = T0 + 100_000;
      at(T0 + 300_000);
      const r1 = await run(
        t,
        state,
        Array.from({ length: MAX_PAGES }, () => full(total, ts)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events.length, MAX_PAGES * PAGE);
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assertEquals(n1.cursor, T0);
      assertEquals(n1.resume?.pos, MAX_PAGES * PAGE);
      at(T0 + 600_000);
      const r2 = await run(t, r1.nextState, [full(total, ts, true)]);
      assertEquals(r2.calls.length, 1);
      assertEquals(JSON.parse(r2.calls[0].body ?? "").offset, MAX_PAGES * PAGE);
      assertEquals(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(n2.cursor, T0 + 300_000);
      assertEquals(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
      assertEquals(new Set(all).size, MAX_PAGES * PAGE + 1);
    } finally {
      clock.now = realNow;
    }
  });
}

test("new-or-updated-contact: an edit to an OLD contact is an event; new-contact ignores it", async () => {
  try {
    at(T0);
    const seededU = await run(newOrUpdatedContact, {}, []);
    const seededN = await run(newContact, {}, []);
    at(T0 + 300_000);
    const edited = rec(OLD, T0 + 200_000);
    const u = await run(newOrUpdatedContact, seededU.nextState, [page([edited], 1)]);
    assertEquals(u.events, [edited]);
    const n = await run(newContact, seededN.nextState, [page([edited], 1)]);
    assertEquals(n.events, []);
  } finally {
    clock.now = realNow;
  }
});

for (const t of [newContact, newOrUpdatedContact]) {
  test(`${t.key}: a contact created 60s before the seed (inside the overlap) never fires`, async () => {
    try {
      const state = await seed(t);
      at(T0 + 300_000);
      const early = rec(T0 - 60_000);
      const r = await run(t, state, [page([early], 1)]);
      assertEquals(r.events, []);
    } finally {
      clock.now = realNow;
    }
  });
}

test("new-or-updated-contact: a second edit of an already emitted contact is a second event", async () => {
  try {
    const state = await seed(newOrUpdatedContact);
    at(T0 + 300_000);
    const v1 = rec(OLD, T0 + 100_000);
    const r1 = await run(newOrUpdatedContact, state, [page([v1], 1)]);
    assertEquals(r1.events, [v1]);
    at(T0 + 600_000);
    const v2 = { ...v1, updatedAt: iso(T0 + 400_000) };
    const r2 = await run(newOrUpdatedContact, r1.nextState, [page([v2], 1)]);
    assertEquals(r2.events, [v2]);
  } finally {
    clock.now = realNow;
  }
});
