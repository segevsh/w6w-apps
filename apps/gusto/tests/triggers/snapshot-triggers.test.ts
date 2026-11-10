import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newOrUpdatedEmployee from "../../triggers/new-or-updated-employee.ts";
import newContractor from "../../triggers/new-contractor.ts";
import newOrUpdatedContractor from "../../triggers/new-or-updated-contractor.ts";
import newPayroll from "../../triggers/new-payroll.ts";
import newOrUpdatedPayroll from "../../triggers/new-or-updated-payroll.ts";
import newTimeOffRequest from "../../triggers/new-time-off-request.ts";
import newOrUpdatedTimeOffRequest from "../../triggers/new-or-updated-time-off-request.ts";
import newContractorPayment from "../../triggers/new-contractor-payment.ts";
import newOrUpdatedContractorPayment from "../../triggers/new-or-updated-contractor-payment.ts";
import newDepartment from "../../triggers/new-department.ts";
import newEmployeeHomeAddress from "../../triggers/new-employee-home-address.ts";
import newGarnishment from "../../triggers/new-garnishment.ts";
import newJobCompensation from "../../triggers/new-job-compensation.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const G = "https://api.gusto.com";

type Case = {
  trigger: typeof newEmployee;
  params?: Record<string, unknown>;
  /** The exact request URL, written out literally. */
  url: string;
  wrap?: (items: unknown[]) => unknown;
  old: Record<string, unknown>;
  fresh: Record<string, unknown>;
  edited?: Record<string, unknown>;
};

const cases: Case[] = [
  {
    trigger: newEmployee,
    url: `${G}/v1/companies/co-1/employees?page=1&per=100`,
    old: { uuid: "e1", version: "v1" },
    fresh: { uuid: "e2", version: "v1" },
    edited: { uuid: "e1", version: "v2" },
  },
  {
    trigger: newOrUpdatedEmployee,
    url: `${G}/v1/companies/co-1/employees?page=1&per=100`,
    old: { uuid: "e1", version: "v1" },
    fresh: { uuid: "e2", version: "v1" },
    edited: { uuid: "e1", version: "v2" },
  },
  {
    trigger: newContractor,
    url: `${G}/v1/companies/co-1/contractors?page=1&per=100`,
    old: { uuid: "c1", version: "v1" },
    fresh: { uuid: "c2", version: "v1" },
    edited: { uuid: "c1", version: "v2" },
  },
  {
    trigger: newOrUpdatedContractor,
    url: `${G}/v1/companies/co-1/contractors?page=1&per=100`,
    old: { uuid: "c1", version: "v1" },
    fresh: { uuid: "c2", version: "v1" },
    edited: { uuid: "c1", version: "v2" },
  },
  {
    trigger: newPayroll,
    url:
      `${G}/v1/companies/co-1/payrolls?start_date=2026-05-14&end_date=2027-01-09&processing_statuses=processed%2Cunprocessed&page=1&per=100`,
    old: { payroll_uuid: "p1", processed: false },
    fresh: { payroll_uuid: "p2", processed: false },
    edited: { payroll_uuid: "p1", processed: true },
  },
  {
    trigger: newOrUpdatedPayroll,
    url:
      `${G}/v1/companies/co-1/payrolls?start_date=2026-05-14&end_date=2027-01-09&processing_statuses=processed%2Cunprocessed&page=1&per=100`,
    old: { payroll_uuid: "p1", processed: false },
    fresh: { payroll_uuid: "p2", processed: false },
    edited: { payroll_uuid: "p1", processed: true },
  },
  {
    trigger: newTimeOffRequest,
    url: `${G}/v1/companies/co-1/time_off_requests?start_date=2026-08-12&page=1&per=100`,
    old: { uuid: "t1", status: "pending" },
    fresh: { uuid: "t2", status: "pending" },
    edited: { uuid: "t1", status: "approved" },
  },
  {
    trigger: newOrUpdatedTimeOffRequest,
    url: `${G}/v1/companies/co-1/time_off_requests?start_date=2026-08-12&page=1&per=100`,
    old: { uuid: "t1", status: "pending" },
    fresh: { uuid: "t2", status: "pending" },
    edited: { uuid: "t1", status: "approved" },
  },
  {
    trigger: newContractorPayment,
    url: `${G}/v1/companies/co-1/contractor_payments?start_date=2026-10-11&end_date=2026-11-10`,
    wrap: (items) => ({
      contractor_payments: items.map((p) => ({ contractor_uuid: "c1", payments: [p] })),
    }),
    old: { uuid: "cp1", contractor_uuid: "c1", status: "Unfunded" },
    fresh: { uuid: "cp2", contractor_uuid: "c1", status: "Unfunded" },
    edited: { uuid: "cp1", contractor_uuid: "c1", status: "Funded" },
  },
  {
    trigger: newOrUpdatedContractorPayment,
    url: `${G}/v1/companies/co-1/contractor_payments?start_date=2026-10-11&end_date=2026-11-10`,
    wrap: (items) => ({
      contractor_payments: items.map((p) => ({ contractor_uuid: "c1", payments: [p] })),
    }),
    old: { uuid: "cp1", contractor_uuid: "c1", status: "Unfunded" },
    fresh: { uuid: "cp2", contractor_uuid: "c1", status: "Unfunded" },
    edited: { uuid: "cp1", contractor_uuid: "c1", status: "Funded" },
  },
  {
    trigger: newDepartment,
    url: `${G}/v1/companies/co-1/departments?page=1&per=100`,
    old: { uuid: "d1", title: "Support" },
    fresh: { uuid: "d2", title: "Sales" },
    edited: { uuid: "d1", title: "Success" },
  },
  {
    trigger: newEmployeeHomeAddress,
    params: { employeeId: "emp-1" },
    url: `${G}/v1/employees/emp-1/home_addresses`,
    old: { uuid: "h1", active: true },
    fresh: { uuid: "h2", active: true },
    edited: { uuid: "h1", active: false },
  },
  {
    trigger: newGarnishment,
    params: { employeeId: "emp-1" },
    url: `${G}/v1/employees/emp-1/garnishments?page=1&per=100`,
    old: { uuid: "g1", active: true },
    fresh: { uuid: "g2", active: true },
    edited: { uuid: "g1", active: false },
  },
  {
    trigger: newJobCompensation,
    params: { jobId: "job-1" },
    url: `${G}/v1/jobs/job-1/compensations?page=1&per=100`,
    old: { uuid: "k1", rate: "10.00" },
    fresh: { uuid: "k2", rate: "11.00" },
    edited: { uuid: "k1", rate: "12.00" },
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
  const body = (items: unknown[]) => c.wrap ? c.wrap(items) : items;
  const poll = (state: unknown, items: unknown[]) => {
    const m = mockCtx([{ body: body(items) }], conn);
    return c.trigger.poll!({ params: c.params ?? {}, state } as never, m.ctx).then((r) => ({
      r,
      calls: m.calls,
    }));
  };

  describe(key, () => {
    test("first check seeds without emitting and requests the literal list URL", async () => {
      const { r, calls } = await poll({}, [c.old]);
      assertEquals(r.events, []);
      assertEquals((r.nextState as { seeded: boolean }).seeded, true);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
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

describe("per-parent triggers", () => {
  for (
    const [t, name] of [
      [newEmployeeHomeAddress, "employeeId"],
      [newGarnishment, "employeeId"],
      [newJobCompensation, "jobId"],
    ] as const
  ) {
    test(`${t.key} refuses to run without ${name}`, async () => {
      const m = mockCtx([], conn);
      await assertRejects(
        async () => await t.poll!({ params: {}, state: {} } as never, m.ctx),
        Error,
        name,
      );
      assertEquals(m.calls.length, 0);
    });
  }
});
