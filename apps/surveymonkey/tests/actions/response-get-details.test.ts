import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-get-details.ts";

Deno.test("response-get-details: GETs /surveys/{id}/responses/{response_id}/details", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", pages: [] } }]);
  const result = await action.execute(
    { surveyId: "s1", responseId: "r1", simple: true },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/surveys/s1/responses/r1/details");
  assertEquals(url.searchParams.get("simple"), "true");
  assertEquals(result, { id: "r1", pages: [] });
});
