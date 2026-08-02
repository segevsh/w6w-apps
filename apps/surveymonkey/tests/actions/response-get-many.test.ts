import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-get-many.ts";

Deno.test("response-get-many: GETs /surveys/{id}/responses/bulk with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  await action.execute(
    {
      surveyId: "s1",
      page: 1,
      perPage: 100,
      simple: true,
      collectorIds: "c1,c2",
      status: "completed",
      sortBy: "date_modified",
      sortOrder: "ASC",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/surveys/s1/responses/bulk");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "100");
  assertEquals(url.searchParams.get("simple"), "true");
  assertEquals(url.searchParams.get("collector_ids"), "c1,c2");
  assertEquals(url.searchParams.get("status"), "completed");
  assertEquals(url.searchParams.get("sort_by"), "date_modified");
  assertEquals(url.searchParams.get("sort_order"), "ASC");
});

Deno.test("response-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ surveyId: "s1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
