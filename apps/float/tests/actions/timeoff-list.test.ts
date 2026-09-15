import { assertEquals } from "@std/assert";
import timeoffList from "../../actions/timeoff-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-list - GETs /timeoffs with the date range", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ timeoff_id: 1 }],
    headers: paginationHeaders(),
  }]);
  const out = asListResult(
    await timeoffList.execute({ start_date: "2025-01-01", end_date: "2025-01-31" }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/v3/timeoffs");
  assertEquals(queryOf(calls[0].url), { start_date: "2025-01-01", end_date: "2025-01-31" });
  assertEquals(out.items, [{ timeoff_id: 1 }]);
});
