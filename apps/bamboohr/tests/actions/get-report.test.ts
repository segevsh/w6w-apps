import { assertEquals } from "@std/assert";
import getReport from "../../actions/get-report.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("get-report: reads /custom-reports/{reportId}", async () => {
  assertEquals(getReport.type, "read");
  const { ctx, calls } = mockCtx([{ body: { rows: [] } }]);
  await getReport.execute({ reportId: 123 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/custom-reports/123");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-report: reportId is a required integer — the docs type it that way", () => {
  const p = param(getReport, "reportId");
  assertEquals(p.required, true);
  assertEquals(p.type, "number");
  assertEquals(p.validation, { integer: true });
});

Deno.test("get-report: paging uses the snake_case wire name page_size", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getReport.execute({ reportId: 1, page: 3, pageSize: 1000 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page"), "3");
  assertEquals(q.get("page_size"), "1000");
});
