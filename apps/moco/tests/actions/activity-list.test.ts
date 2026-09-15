import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

Deno.test("activity-list: GETs /activities with date-range filters", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: [{ id: 1, date: "2024-03-21", hours: 2.5 }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "1",
    },
  }]);
  const out = await action.execute(
    { from: "2024-03-01", to: "2024-03-31", projectId: 1234567 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/activities");
  assertEquals(url.searchParams.get("from"), "2024-03-01");
  assertEquals(url.searchParams.get("project_id"), "1234567");
  assertEquals(out, {
    activities: [{ id: 1, date: "2024-03-21", hours: 2.5 }],
    page: 1,
    perPage: 100,
    total: 1,
  });
});
