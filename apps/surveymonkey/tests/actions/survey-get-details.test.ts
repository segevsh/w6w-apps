import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/survey-get-details.ts";

Deno.test("survey-get-details: GETs /surveys/{id}/details", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", pages: [] } }]);
  const result = await action.execute({ surveyId: "s1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v3/surveys/s1/details");
  assertEquals(result, { id: "s1", pages: [] });
});
