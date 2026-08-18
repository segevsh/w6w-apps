import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/timesheet-list.ts";

Deno.test("timesheet-list: cursor-paginated, with contract and date filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "t1" }], page: {} } }], {
    display: {},
  });
  const result = await action.execute!({ contractId: "c1", dateFrom: "2026-08-01" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/rest/timesheets");
  assertEquals(q.get("contract_id"), "c1");
  assertEquals(q.get("date_from"), "2026-08-01");
  assertEquals(result, [{ id: "t1" }]);
});
