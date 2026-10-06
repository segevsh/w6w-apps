import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/leave-apply.ts";

const ok = {
  response: { result: { pkId: "3000000248001", message: "Successfully Added" }, status: 0 },
};

Deno.test("leave-apply: POSTs a leave record with the documented field names", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  const out = await action.execute({
    employeeId: "3000000020481",
    leaveTypeId: "3000000046003",
    from: "07-Jan-2026",
    to: "07-Jan-2026",
    days: { "07-Jan-2026": { LeaveCount: 0.5, Session: 2 } },
    extraFields: { Reason: "Dentist" },
  }, ctx) as { pkId: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms/json/leave/insertRecord");
  assertEquals(JSON.parse(new URLSearchParams(calls[0].body!).get("inputData")!), {
    Reason: "Dentist",
    Employee_ID: "3000000020481",
    Leavetype: "3000000046003",
    From: "07-Jan-2026",
    To: "07-Jan-2026",
    days: { "07-Jan-2026": { LeaveCount: 0.5, Session: 2 } },
  });
  assertEquals(out.pkId, "3000000248001");
});

Deno.test("leave-apply: extraFields cannot override the required fields", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  await action.execute({
    employeeId: "1",
    leaveTypeId: "2",
    from: "a",
    to: "b",
    extraFields: { Employee_ID: "999" },
  }, ctx);
  assertEquals(JSON.parse(new URLSearchParams(calls[0].body!).get("inputData")!).Employee_ID, "1");
});

Deno.test("leave-apply: requires employee, type and dates; not idempotent", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () =>
      action.execute({ employeeId: "1", leaveTypeId: "", from: "a", to: "b" }, ctx) as Promise<
        unknown
      >,
    Error,
    "leaveTypeId",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
