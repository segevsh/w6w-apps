import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newJob from "../../triggers/new-job.ts";
import newOrUpdatedJob from "../../triggers/new-or-updated-job.ts";
import newLead from "../../triggers/new-lead.ts";
import newOrUpdatedLead from "../../triggers/new-or-updated-lead.ts";
import newLocation from "../../triggers/new-location.ts";
import newOrUpdatedLocation from "../../triggers/new-or-updated-location.ts";
import newAppointment from "../../triggers/new-appointment.ts";
import newOrUpdatedAppointment from "../../triggers/new-or-updated-appointment.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newTechnician from "../../triggers/new-technician.ts";
import newBusinessUnit from "../../triggers/new-business-unit.ts";

const B = "https://api.servicetitan.io";
// [trigger, literal base URL, the since filter the request must carry, the stamp the filter compares]
const SINCE = [
  [newJob, `${B}/jpm/v2/tenant/42/jobs`, "createdOnOrAfter", "createdOn"],
  [newOrUpdatedJob, `${B}/jpm/v2/tenant/42/jobs`, "modifiedOnOrAfter", "modifiedOn"],
  [newLead, `${B}/crm/v2/tenant/42/leads`, "createdOnOrAfter", "createdOn"],
  [newOrUpdatedLead, `${B}/crm/v2/tenant/42/leads`, "modifiedOnOrAfter", "modifiedOn"],
  [newLocation, `${B}/crm/v2/tenant/42/locations`, "createdOnOrAfter", "createdOn"],
  [newOrUpdatedLocation, `${B}/crm/v2/tenant/42/locations`, "modifiedOnOrAfter", "modifiedOn"],
  // the appointment list has no created filter: "new" reads modifiedOnOrAfter and keeps by createdOn
  [newAppointment, `${B}/jpm/v2/tenant/42/appointments`, "modifiedOnOrAfter", "modifiedOn"],
  [
    newOrUpdatedAppointment,
    `${B}/jpm/v2/tenant/42/appointments`,
    "modifiedOnOrAfter",
    "modifiedOn",
  ],
] as const;
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const opts = { display: { tenantId: "42" } };
const rec = (id: number, ms: number, modified = ms) => ({
  id,
  createdOn: new Date(ms).toISOString(),
  modifiedOn: new Date(modified).toISOString(),
});
type Result = { events: unknown[]; nextState: Record<string, unknown> };
type Trig = (typeof SINCE)[number][0];
const call = (t: Trig, state: unknown, ctx: never): Promise<Result> =>
  t.poll!({ params: {}, state, subscriptionId: "sub-1" }, ctx) as never;

/** A ctx whose fetch answers from `rows` (newest first, 1-based pages, `hasMore`). */
function serve(rows: () => ReturnType<typeof rec>[], honourSince: boolean, stamp: string) {
  const mock = mockCtx([], opts);
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const u = new URL(String(input));
    const since = Date.parse(
      u.searchParams.get("createdOnOrAfter") ?? u.searchParams.get("modifiedOnOrAfter")!,
    );
    const key = stamp as "createdOn" | "modifiedOn";
    const list = rows().filter((r) => !honourSince || Date.parse(r[key]) >= since)
      .sort((a, b) => Date.parse(b[key]) - Date.parse(a[key]));
    const page = Number(u.searchParams.get("page"));
    const size = Number(u.searchParams.get("pageSize"));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page,
          pageSize: size,
          hasMore: list.length > page * size,
          data: list.slice((page - 1) * size, page * size),
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
  }) as typeof fetch;
  return mock.ctx as never;
}

async function withClock<T>(fn: () => Promise<T>): Promise<T> {
  const original = clock.now;
  try {
    return await fn();
  } finally {
    clock.now = original;
  }
}

test("ServiceTitan record triggers seed without reading, emit a new record, retry, and request literal since filters", async () => {
  await withClock(async () => {
    for (const [trigger, base, filter] of SINCE) {
      clock.now = () => T0;
      const seed = mockCtx([], opts);
      const seeded = await call(trigger, {}, seed.ctx as never);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(seeded.nextState.floor, T0);
      assertEquals(seed.calls.length, 0);

      clock.now = () => T0 + 60_000;
      const body = { data: [rec(1, T0 + 30_000)], hasMore: false };
      const one = mockCtx([{ body }], opts);
      const first = await call(trigger, seeded.nextState, one.ctx as never);
      const retry = await call(trigger, seeded.nextState, mockCtx([{ body }], opts).ctx as never);
      assertEquals(first.events, body.data);
      assertEquals(retry, first);
      assertEquals(one.calls[0].method, "GET");
      assertEquals(
        one.calls[0].url,
        `${base}?${filter}=2026-11-09T12%3A00%3A00.000Z&page=1&pageSize=100`,
      );
    }
  });
});

test("ServiceTitan record triggers drain a window larger than maxPages across checks, none twice", async () => {
  await withClock(async () => {
    for (const [trigger, , , stamp] of SINCE) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx([], opts).ctx as never)).nextState;
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
      const emitted: number[] = [];
      let drainedAt = -1;
      for (let k = 0; k < 6 && drainedAt < 0; k++) {
        clock.now = () => T0 + 60_000 + k * 300_000;
        const r = await call(trigger, state, serve(() => rows, true, stamp));
        for (const e of r.events) emitted.push((e as { id: number }).id);
        state = r.nextState;
        if (k === 0) {
          assertEquals(r.events.length, 200);
          assertEquals(state.cursor, T0);
          assertEquals((state.resume as { pos: number }).pos, 3);
        }
        if (state.resume === undefined) drainedAt = k;
      }
      assertEquals(drainedAt, 1);
      assertEquals(emitted.length, 250);
      assertEquals(new Set(emitted).size, 250);
      assertEquals(state.cursor, T0 + 60_000);
    }
  });
});

test("ServiceTitan record triggers never emit a record that existed before the seed", async () => {
  await withClock(async () => {
    for (const [trigger, , , stamp] of SINCE) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx([], opts).ctx as never)).nextState;
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
      let now = T0 + 30_000;
      const run = async () => {
        clock.now = () => now;
        const r = await call(trigger, state, serve(() => rows, false, stamp));
        state = r.nextState;
        now += 300_000;
        return r;
      };
      for (let k = 0; k < 4; k++) assertEquals((await run()).events, []);
      rows.push(rec(999, T0 + 31_000));
      const got: unknown[] = [];
      for (let k = 0; k < 4; k++) got.push(...(await run()).events);
      assertEquals(got, [rec(999, T0 + 31_000)]);
    }
  });
});

test("ServiceTitan new-or-updated triggers emit an edit to an OLD record; the new-* twins do not", async () => {
  await withClock(async () => {
    const old = T0 - 86_400_000;
    for (
      const [updated, created] of [
        [newOrUpdatedJob, newJob],
        [newOrUpdatedLead, newLead],
        [newOrUpdatedLocation, newLocation],
        [newOrUpdatedAppointment, newAppointment],
      ] as const
    ) {
      clock.now = () => T0;
      const sU = (await call(updated, {}, mockCtx([], opts).ctx as never)).nextState;
      const sN = (await call(created, {}, mockCtx([], opts).ctx as never)).nextState;
      clock.now = () => T0 + 60_000;
      const edited = rec(7, old, T0 + 30_000);
      const body = { data: [edited], hasMore: false };
      const u = await call(updated, sU, mockCtx([{ body }], opts).ctx as never);
      assertEquals(u.events, [edited]);
      const n = await call(created, sN, mockCtx([{ body }], opts).ctx as never);
      assertEquals(n.events, []);
    }
  });
});

const SNAPSHOTS = [
  [newEmployee, `${B}/settings/v2/tenant/42/employees`],
  [newTechnician, `${B}/settings/v2/tenant/42/technicians`],
  [newBusinessUnit, `${B}/settings/v2/tenant/42/business-units`],
] as const;
const row = (id: number) => ({ id, name: `row ${id}` });
const list = (data: unknown[], hasMore = false) => ({ body: { page: 1, data, hasMore } });
const snap = (t: (typeof SNAPSHOTS)[number][0], state: unknown, rs: ReturnType<typeof list>[]) => {
  const m = mockCtx(rs, opts);
  return (t.poll!({ params: {}, state, subscriptionId: "sub-1" }, m.ctx) as unknown as Promise<
    Result
  >).then((r) => ({ ...r, calls: m.calls }));
};

for (const [t, url] of SNAPSHOTS) {
  test(`${t.key}: seeds, emits only the added row, retries identically, sends the literal request`, async () => {
    const seeded = await snap(t, {}, [list([row(1)])]);
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, `${url}?page=1&pageSize=200`);
    const first = await snap(t, seeded.nextState, [list([row(1), row(2)])]);
    const retry = await snap(t, seeded.nextState, [list([row(1), row(2)])]);
    assertEquals(first.events, [row(2)]);
    assertEquals(retry.events, first.events);
    assertEquals(retry.nextState, first.nextState);
  });

  test(`${t.key}: reads every page of the list`, async () => {
    const seeded = await snap(t, {}, [list([row(1)], true), list([row(2)])]);
    assertEquals(seeded.calls.length, 2);
    assertEquals(seeded.calls[1].url, `${url}?page=2&pageSize=200`);
    const next = await snap(t, seeded.nextState, [list([row(1)], true), list([row(2), row(3)])]);
    assertEquals(next.events, [row(3)]);
  });
}
