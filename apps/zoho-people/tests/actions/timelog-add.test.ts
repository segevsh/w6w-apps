import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/timelog-add.ts";

Deno.test("timelog-add: POSTs addtimelog with the documented params and returns the id", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: {
      response: {
        result: [{ timeLogId: "55" }],
        message: "Timelog entry added Successfully",
        status: 0,
      },
    },
  }]);
  const out = await action.execute({
    user: "j@x.com",
    jobId: "12",
    workDate: "2026-09-15",
    hours: "2:30",
    billingStatus: "billable",
    description: "Wrote docs",
  }, ctx) as { timeLogId: string; message: string };
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/people/api/timetracker/addtimelog");
  assertEquals(url.searchParams.get("jobId"), "12");
  assertEquals(url.searchParams.get("hours"), "2:30");
  assertEquals(url.searchParams.get("description"), "Wrote docs");
  assertEquals(out.timeLogId, "55");
});

Deno.test("timelog-add: needs hours or a from/to pair; required ids first", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ timeLogId: "1" }], status: 0 } },
  }]);
  await assertRejects(
    () =>
      action.execute({ user: "u", jobId: "1", workDate: "2026-09-15" }, ctx) as Promise<unknown>,
    Error,
    "hours",
  );
  await assertRejects(
    () =>
      action.execute({ user: "u", jobId: "", workDate: "d", hours: "1" }, ctx) as Promise<unknown>,
    Error,
    "jobId",
  );
  assertEquals(calls.length, 0);
  await action.execute({
    user: "u",
    jobId: "1",
    workDate: "2026-09-15",
    fromTime: "09:00",
    toTime: "10:00",
  }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("timelog-add: vendor refusal (8008 weekend/holiday) is thrown; not idempotent", async () => {
  const { ctx } = mockPeopleCtx([{
    status: 400,
    body: {
      response: {
        errors: [{ code: 8008, message: "Cannot log time during Weekend/Holidays/Leave" }],
        status: 1,
      },
    },
  }]);
  await assertRejects(
    () =>
      action.execute({ user: "u", jobId: "1", workDate: "d", hours: "1" }, ctx) as Promise<unknown>,
    Error,
    "8008",
  );
  assertEquals(action.idempotent, false);
});
