import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get-many.ts";

Deno.test("page-get-many: GETs /surveys/{id}/pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  await action.execute({ surveyId: "s1", page: 2, perPage: 25 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/surveys/s1/pages");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "25");
});
