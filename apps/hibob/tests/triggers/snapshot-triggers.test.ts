import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newOrUpdatedEmployee from "../../triggers/new-or-updated-employee.ts";
import newWorkHistoryEntry from "../../triggers/new-work-history-entry.ts";
import newEmploymentHistoryEntry from "../../triggers/new-employment-history-entry.ts";
import newLifecycleHistoryEntry from "../../triggers/new-lifecycle-history-entry.ts";
import newAttendanceEntry from "../../triggers/new-attendance-entry.ts";

const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const B = "https://api.hibob.com/v1";
const att = (id: number, clockOut?: string) => ({
  objectType: "attendanceEntry",
  fields: {
    "/attendanceEntry/id": { value: id },
    ...(clockOut ? { "/attendanceEntry/clockOutTime": { value: clockOut } } : {}),
  },
});

type Case = {
  trigger: typeof newEmployee;
  params?: Record<string, unknown>;
  method: "GET" | "POST";
  url: string;
  /** The exact request body (parsed), written out literally. */
  reqBody?: unknown;
  wrap: (items: unknown[]) => unknown;
  old: unknown;
  fresh: unknown;
  edited: unknown;
};

const rows = (items: unknown[]) => ({ values: items });
const cases: Case[] = [
  {
    trigger: newEmployee,
    method: "POST",
    url: `${B}/people/search`,
    reqBody: {},
    wrap: (items) => ({ employees: items }),
    old: { id: "1", email: "a@example.com" },
    fresh: { id: "2", email: "b@example.com" },
    edited: { id: "1", email: "c@example.com" },
  },
  {
    trigger: newOrUpdatedEmployee,
    method: "POST",
    url: `${B}/people/search`,
    reqBody: {},
    wrap: (items) => ({ employees: items }),
    old: { id: "1", email: "a@example.com" },
    fresh: { id: "2", email: "b@example.com" },
    edited: { id: "1", email: "c@example.com" },
  },
  {
    trigger: newWorkHistoryEntry,
    params: { employeeId: "42" },
    method: "GET",
    url: `${B}/people/42/work`,
    wrap: rows,
    old: { id: 1, title: "a" },
    fresh: { id: 2, title: "b" },
    edited: { id: 1, title: "z" },
  },
  {
    trigger: newEmploymentHistoryEntry,
    params: { employeeId: "42" },
    method: "GET",
    url: `${B}/people/42/employment`,
    wrap: rows,
    old: { id: 1, contract: "a" },
    fresh: { id: 2, contract: "b" },
    edited: { id: 1, contract: "z" },
  },
  {
    trigger: newLifecycleHistoryEntry,
    params: { employeeId: "42" },
    method: "GET",
    url: `${B}/people/42/lifecycle`,
    wrap: rows,
    old: { id: 1, status: "Hired" },
    fresh: { id: 2, status: "Terminated" },
    edited: { id: 1, status: "Rehired" },
  },
  {
    trigger: newAttendanceEntry,
    params: { employeeId: "42" },
    method: "POST",
    url: `${B}/attendance/entries/search`,
    reqBody: {
      fields: [
        "/attendanceEntry/id",
        "/attendanceEntry/employeeId",
        "/attendanceEntry/clockInDate",
        "/attendanceEntry/type",
        "/attendanceEntry/clockInTime",
        "/attendanceEntry/clockOutDate",
        "/attendanceEntry/clockOutTime",
        "/attendanceEntry/duration",
        "/attendanceEntry/reasonCode",
        "/attendanceEntry/notes",
        "/attendanceEntry/projectId",
        "/attendanceEntry/taskId",
      ],
      filters: [
        { fieldId: "/attendanceEntry/employeeId", operator: "equals", values: ["42"] },
        { fieldId: "/attendanceEntry/clockInDate", operator: "from", values: ["2026-11-03"] },
        { fieldId: "/attendanceEntry/clockInDate", operator: "to", values: ["2026-11-10"] },
      ],
    },
    wrap: (items) => ({ items, response_metadata: { next_cursor: null } }),
    old: att(1),
    fresh: att(2),
    edited: att(1, "17:00"),
  },
];

const realNow = Date.now;
Date.now = () => NOW;
process.on("exit", () => {
  Date.now = realNow;
});

for (const c of cases) {
  const key = c.trigger.key;
  const updated = key.startsWith("new-or-updated-");
  const poll = async (state: unknown, items: unknown[]) => {
    const m = mockCtx([{ body: c.wrap(items) }]);
    const r = await c.trigger.poll!({ params: c.params ?? {}, state } as never, m.ctx);
    return { r, calls: m.calls };
  };

  describe(key, () => {
    test("first check seeds without emitting and sends the literal request", async () => {
      const { r, calls } = await poll({}, [c.old]);
      assertEquals(r.events, []);
      assertEquals((r.nextState as { seeded: boolean }).seeded, true);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, c.method);
      assertEquals(calls[0].url, c.url);
      if (c.reqBody !== undefined) assertEquals(JSON.parse(calls[0].body ?? "null"), c.reqBody);
    });

    test("a new record is emitted exactly once", async () => {
      const { r: seeded } = await poll({}, [c.old]);
      const { r } = await poll(seeded.nextState, [c.old, c.fresh]);
      assertEquals(r.events, [c.fresh]);
      const { r: again } = await poll(r.nextState, [c.old, c.fresh]);
      assertEquals(again.events, []);
    });

    test("retrying the same state and response gives the same result", async () => {
      const { r: seeded } = await poll({}, [c.old]);
      const one = await poll(seeded.nextState, [c.old, c.fresh]);
      const two = await poll(seeded.nextState, [c.old, c.fresh]);
      assertEquals(one.r, two.r);
    });

    test(
      updated ? "an edited record is emitted again" : "an edited record is not a new one",
      async () => {
        const { r: seeded } = await poll({}, [c.old]);
        const { r } = await poll(seeded.nextState, [c.edited]);
        assertEquals(r.events, updated ? [c.edited] : []);
      },
    );
  });
}

describe("new-attendance-entry paging", () => {
  test("follows next_cursor and sends it on the second request", async () => {
    const m = mockCtx([
      { body: { items: [att(1)], response_metadata: { next_cursor: "abc" } } },
      { body: { items: [att(2)], response_metadata: { next_cursor: null } } },
    ]);
    const seeded = await newAttendanceEntry.poll!(
      { params: { employeeId: "42" }, state: {} } as never,
      m.ctx,
    );
    assertEquals(m.calls.length, 2);
    assertEquals(JSON.parse(m.calls[1].body ?? "{}").cursor, "abc");
    const m2 = mockCtx([
      { body: { items: [att(1)], response_metadata: { next_cursor: "abc" } } },
      { body: { items: [att(2), att(3)], response_metadata: { next_cursor: null } } },
    ]);
    const next = await newAttendanceEntry.poll!(
      { params: { employeeId: "42" }, state: seeded.nextState } as never,
      m2.ctx,
    );
    assertEquals(next.events, [att(3)]);
  });

  test("lookbackDays above Bob's 33-day cap is clamped to 33", async () => {
    const m = mockCtx([{ body: { items: [] } }]);
    await newAttendanceEntry.poll!(
      { params: { employeeId: "42", lookbackDays: 90 }, state: {} } as never,
      m.ctx,
    );
    const filters = JSON.parse(m.calls[0].body ?? "{}").filters;
    assertEquals(filters[1].values, ["2026-10-08"]);
  });
});

describe("per-employee triggers", () => {
  for (
    const t of [
      newWorkHistoryEntry,
      newEmploymentHistoryEntry,
      newLifecycleHistoryEntry,
      newAttendanceEntry,
    ]
  ) {
    test(`${t.key} refuses to run without employeeId`, async () => {
      const m = mockCtx([]);
      await assertRejects(
        async () => await t.poll!({ params: {}, state: {} } as never, m.ctx),
        Error,
        "employeeId",
      );
      assertEquals(m.calls.length, 0);
    });
  }
});
