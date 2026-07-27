import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get-many.ts";

Deno.test("time-entry-get-many: GETs /team/{id}/time_entries with a ms date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({
    teamId: "42",
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T00:00:00.000Z",
    assignee: 5,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/team/42/time_entries");
  assertEquals(url.searchParams.get("start_date"), String(Date.parse("2026-08-01T00:00:00.000Z")));
  assertEquals(url.searchParams.get("end_date"), String(Date.parse("2026-08-31T00:00:00.000Z")));
  assertEquals(url.searchParams.get("assignee"), "5");
});
