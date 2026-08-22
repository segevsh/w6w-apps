import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-terminate.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-terminate: refuses without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ employeeId: "e1", effectiveDate: "2026-09-01" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("employee-terminate: confirmed, it posts the termination", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "t1" } }], conn);
  await action.execute!(
    { employeeId: "e1", effectiveDate: "2026-09-01", confirm: true },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/employees/e1/terminations");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.effective_date, "2026-09-01");
  assertEquals(sent.run_termination_payroll, true);
});

Deno.test("employee-terminate: an effective date is required", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ employeeId: "e1", confirm: true }, ctx),
    Error,
    "effectiveDate",
  );
});

/** The date has legal consequences in several US states. */
Deno.test("employee-terminate: the date hint explains the final-paycheck rule", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "effectiveDate")!;
  assert(/final paycheck/i.test(p.hint!), p.hint);
  assertEquals(action.idempotent, false);
});
