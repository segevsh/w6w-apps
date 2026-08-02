import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/survey-get.ts";

Deno.test("survey-get: GETs /surveys/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", title: "NPS" } }]);
  const result = await action.execute({ surveyId: "s1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/surveys/s1");
  assertEquals(result, { id: "s1", title: "NPS" });
});
