import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/timesheet-list.ts";

Deno.test("timesheet-list: GETs /2.0/timesheet with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, date: "2026-09-15" }] }]);
  const result = await action.execute!({ orderBy: "date", descending: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/timesheet");
  assertEquals(url.searchParams.get("order_by"), "date_desc");
  assertEquals(result, [{ id: 1, date: "2026-09-15" }]);
});
