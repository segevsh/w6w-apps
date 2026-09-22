import { assertEquals } from "@std/assert";
import reportRun from "../../actions/report-run.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("report-run: POSTs /v2/report and returns the untyped body under a name", async () => {
  const { ctx, calls } = mockCtx([{ body: { totals: { count: 42 } } }]);
  const result = await reportRun.execute({
    statistics: [{ mode: "count" }],
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/report");
  assertEquals(bodyOf(calls[0]), { statistics: [{ mode: "count" }] });
  assertEquals(result.report, { totals: { count: 42 } });
});

Deno.test("report-run: the view and the time breakdown are query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await reportRun.execute({
    statistics: [{ mode: "sum", column: "job_total_planned_time_ex_tax" }],
    searchView: "jobs",
    timeBreakdown: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), { search_view: "jobs", time_breakdown: "true" });
  assertEquals(bodyOf(calls[0]), {
    statistics: [{ mode: "sum", column: "job_total_planned_time_ex_tax" }],
  });
});

Deno.test("report-run: time_breakdown is opt-in and never sent as false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await reportRun.execute({ statistics: [{ mode: "count" }] }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/** The schema's own rule: statistics is required. */
Deno.test("report-run: a report with no statistics is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await reportRun.execute({ statistics: [] }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("statistics is required"), true);
  assertEquals(calls.length, 0);
});

/** The schema's other rule: a date range needs a dateField. */
Deno.test("report-run: a date range without a date field is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await reportRun.execute({
      statistics: [{ mode: "count" }],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("dateField is required"), true);
  assertEquals(calls.length, 0);
});

Deno.test("report-run: with a date field the range is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await reportRun.execute({
    statistics: [{ mode: "average", column: "invoice_currency_total_amount_inc_tax" }],
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    dateField: "invoice_date",
    groupBy: "job_id",
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    statistics: [{ mode: "average", column: "invoice_currency_total_amount_inc_tax" }],
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    dateField: "invoice_date",
    groupBy: "job_id",
  });
});
