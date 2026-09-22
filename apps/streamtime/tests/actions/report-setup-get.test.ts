import { assertEquals } from "@std/assert";
import reportSetupGet from "../../actions/report-setup-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("report-setup-get: reads GET /v2/report/setup and returns the three arrays", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        groupingOptions: ["company_id", "job_status"],
        statistics: ["job_total_planned_time_ex_tax"],
        filters: [{ selector: "job_start_date", filterType: "Date" }],
      },
    },
  ]);
  const result = await reportSetupGet.execute({ searchView: "jobs" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/report/setup");
  assertEquals(queryOf(calls[0].url), { search_view: "jobs" });
  assertEquals(result.groupingOptions, ["company_id", "job_status"]);
});

/** The report view list is not the search view list: 12 entries, no line items. */
Deno.test("report-setup-get: only the 12 documented report views are offered", () => {
  const view = (reportSetupGet.params ?? []).find((p) => p.key === "searchView");
  const options = Array.isArray(view?.options) ? view!.options! : [];
  assertEquals(options.length, 12);
  assertEquals(options.some((o) => o.value === "invoice_line_items"), false);
  assertEquals(options.some((o) => o.value === "job_group_periods"), false);
});
