import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payroll-get.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("payroll-get: reads one payroll under its company", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { payroll_uuid: "p1" } }], conn);
  await action.execute!({ payrollId: "p1", include: "taxes" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/payrolls/p1");
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "taxes");
});

Deno.test("payroll-get: a missing payroll id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "payrollId");
});

/** Posting projections as actuals produces books that disagree with the bank. */
Deno.test("payroll-get: says unprocessed numbers are a projection", () => {
  assert(/projection/i.test(action.description!), action.description);
});
