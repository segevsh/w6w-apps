import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/report-profit-and-loss.ts";

Deno.test("report-profit-and-loss: GETs /reports/ProfitAndLoss with no params when omitted", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Header: {}, Rows: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/company/123145/reports/ProfitAndLoss");
  assertEquals(url.searchParams.has("start_date"), false);
});

Deno.test("report-profit-and-loss: forwards date range, accounting method and summarize_column_by", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: {} }]);
  await action.execute({
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    accountingMethod: "Accrual",
    summarizeColumnBy: "Month",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("start_date"), "2026-01-01");
  assertEquals(url.searchParams.get("end_date"), "2026-06-30");
  assertEquals(url.searchParams.get("accounting_method"), "Accrual");
  assertEquals(url.searchParams.get("summarize_column_by"), "Month");
});
