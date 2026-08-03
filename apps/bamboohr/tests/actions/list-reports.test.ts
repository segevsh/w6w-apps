import { assertEquals } from "@std/assert";
import listReports from "../../actions/list-reports.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-reports: searches /custom-reports", async () => {
  assertEquals(listReports.type, "search");
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listReports.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/custom-reports");
  assertEquals(url.search, "");
});

Deno.test("list-reports: paging uses the snake_case wire name page_size", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listReports.execute({ page: 2, pageSize: 100 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("page_size"), "100");
  assertEquals(q.has("pageSize"), false);
});
