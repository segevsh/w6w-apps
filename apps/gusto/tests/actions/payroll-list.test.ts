import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payroll-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("payroll-list: reads the company's payrolls with its filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ payroll_uuid: "p1" }] }], conn);
  await action.execute!({
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    processingStatuses: "processed",
    include: "totals",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/companies/co-1/payrolls");
  assertEquals(url.searchParams.get("start_date"), "2026-07-01");
  assertEquals(url.searchParams.get("processing_statuses"), "processed");
  assertEquals(url.searchParams.get("include"), "totals");
});

/** An unprocessed payroll is a draft whose totals still move. */
Deno.test("payroll-list: the description warns about unprocessed payrolls", () => {
  assert(/draft/i.test(action.description!), action.description);
});
