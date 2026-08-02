import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collector-get-many.ts";

Deno.test("collector-get-many: GETs /surveys/{id}/collectors with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  await action.execute(
    { surveyId: "s1", name: "Email blast", sortBy: "name", sortOrder: "ASC" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/surveys/s1/collectors");
  assertEquals(url.searchParams.get("name"), "Email blast");
  assertEquals(url.searchParams.get("sort_by"), "name");
  assertEquals(url.searchParams.get("sort_order"), "ASC");
});
