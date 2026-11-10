import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newTrigger from "../../triggers/new-time-off-request.ts";
import updatedTrigger from "../../triggers/new-or-updated-time-off-request.ts";

const T0 = Date.parse("2026-11-10T12:00:00Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const URL_T0 = "https://acme.bamboohr.com/api/v1/time_off/requests?start=2026-11-10&end=2027-11-10";
const req = (id: string, created: string, updated: string) => ({
  id,
  employeeId: "4",
  name: `Employee ${id}`,
  status: { status: "requested", lastChanged: created },
  start: "2026-12-21",
  end: "2026-12-23",
  created,
  updated,
});
const old = (id: string) => req(id, "2026-10-01", "2026-10-01T09:00:00Z");
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

describe("time off request triggers", () => {
  for (const [name, trigger] of [["new", newTrigger], ["updated", updatedTrigger]] as const) {
    test(`${name}: seeds without emitting and requests the 365-day window literally`, async () => {
      clock.now = () => T0;
      const seed = ctx([old("a")]);
      const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, URL_T0);
    });

    test(`${name}: requests that predate the seed never fire, even when they enter the window later`, async () => {
      clock.now = () => T0;
      const seeded = await trigger.poll!({ ...input, state: {} }, ctx([old("a")]).ctx);
      clock.now = () => T1;
      const flood = Array.from({ length: 450 }, (_, i) => old(`old-${i}`));
      const page = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(flood).ctx);
      assertEquals(page.events, []);
      const fresh = req("fresh", "2026-11-10", "2026-11-10T12:03:00Z");
      const after = await trigger.poll!(
        { ...input, state: page.nextState },
        ctx([...flood, fresh]).ctx,
      );
      assertEquals(after.events, [fresh]);
    });

    test(`${name}: more than 100 new requests drain across checks, once each`, async () => {
      clock.now = () => T0;
      const seeded = await trigger.poll!({ ...input, state: {} }, ctx([]).ctx);
      clock.now = () => T1;
      const batch = Array.from(
        { length: 101 },
        (_, i) => req(`n-${i}`, "2026-11-10", "2026-11-10T12:02:00Z"),
      );
      const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(batch).ctx);
      assertEquals(first.events.length, 100);
      const second = await trigger.poll!({ ...input, state: first.nextState }, ctx(batch).ctx);
      assertEquals(second.events.length, 1);
      const all = [...first.events, ...second.events].map((e) => (e as { id: string }).id);
      assertEquals(new Set(all).size, 101);
      const third = await trigger.poll!({ ...input, state: second.nextState }, ctx(batch).ctx);
      assertEquals(third.events, []);
    });
  }

  test("new: emits a created request, retries idempotently, ignores an edit", async () => {
    clock.now = () => T0;
    const seeded = await newTrigger.poll!({ ...input, state: {} }, ctx([old("a")]).ctx);
    clock.now = () => T1;
    const fresh = req("b", "2026-11-10", "2026-11-10T12:01:00Z");
    const edited = { ...old("a"), updated: "2026-11-10T12:02:00Z" };
    const page = [old("a"), fresh];
    const first = await newTrigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await newTrigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
    const editOnly = await newTrigger.poll!(
      { ...input, state: first.nextState },
      ctx([edited, fresh]).ctx,
    );
    assertEquals(editOnly.events, []);
  });

  test("new-or-updated: an edited request is a new event; an unchanged one is not", async () => {
    clock.now = () => T0;
    const seeded = await updatedTrigger.poll!({ ...input, state: {} }, ctx([old("a")]).ctx);
    clock.now = () => T1;
    const edited = { ...old("a"), updated: "2026-11-10T12:02:00Z" };
    const first = await updatedTrigger.poll!(
      { ...input, state: seeded.nextState },
      ctx([edited]).ctx,
    );
    const retry = await updatedTrigger.poll!(
      { ...input, state: seeded.nextState },
      ctx([edited]).ctx,
    );
    assertEquals(first.events, [edited]);
    assertEquals(retry, first);
    const same = await updatedTrigger.poll!(
      { ...input, state: first.nextState },
      ctx([edited]).ctx,
    );
    assertEquals(same.events, []);
  });
});
