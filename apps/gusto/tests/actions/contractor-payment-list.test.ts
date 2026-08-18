import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contractor-payment-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("contractor-payment-list: sends the required window", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contractor_payments: [] } }], conn);
  await action.execute!({ startDate: "2026-07-01", endDate: "2026-07-31" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/companies/co-1/contractor_payments");
  assertEquals(url.searchParams.get("start_date"), "2026-07-01");
  assertEquals(url.searchParams.get("end_date"), "2026-07-31");
});

Deno.test("contractor-payment-list: both dates are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ startDate: "2026-07-01" }, ctx),
    Error,
    "window",
  );
  assertEquals(calls.length, 0);
});
