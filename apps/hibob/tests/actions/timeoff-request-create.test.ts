import { assertEquals, assertRejects } from "@std/assert";
import create from "../../actions/timeoff-request-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const days = {
  employeeId: "11",
  requestRangeType: "days" as const,
  policyType: "Holiday",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
};

Deno.test("timeoff-request-create: a days request defaults both portions to all_day", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await create.execute(days, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/employees/11/requests");
  assertEquals(bodyOf(calls[0]), {
    requestRangeType: "days",
    policyType: "Holiday",
    startDate: "2026-12-01",
    endDate: "2026-12-03",
    startDatePortion: "all_day",
    endDatePortion: "all_day",
  });
  assertEquals(out, { status: 200 });
});

Deno.test("timeoff-request-create: an hours request sends hours/minutes, not portions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await create.execute({
    ...days,
    requestRangeType: "hours",
    endDate: "2026-12-01",
    hours: 2,
    minutes: 30,
    description: "Dentist",
    reasonCode: 5,
    skipManagerApproval: true,
    approver: "9",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    requestRangeType: "hours",
    policyType: "Holiday",
    startDate: "2026-12-01",
    endDate: "2026-12-01",
    hours: 2,
    minutes: 30,
    skipManagerApproval: true,
    approver: "9",
    description: "Dentist",
    reasonCode: 5,
  });
});

Deno.test("timeoff-request-create: hours validation fails before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(create.execute({ ...days, requestRangeType: "hours" }, ctx)),
    Error,
    "hours and minutes",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        create.execute({ ...days, requestRangeType: "hours", hours: 1, minutes: 0 }, ctx),
      ),
    Error,
    "endDate must equal startDate",
  );
  await assertRejects(() =>
    Promise.resolve(
      create.execute({ ...days, requestRangeType: "portionOnRange" as unknown as "days" }, ctx),
    )
  );
  assertEquals(calls.length, 0);
});
