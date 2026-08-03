import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/question-update.ts";

Deno.test("question-update: PATCHes only the title", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "q1", title: "Work email" } }]);
  const result = await action.execute({ formId: "f1", questionId: "q1", title: "Work email" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/questions/q1");
  assertEquals(jsonBody(calls[0]), { title: "Work email" });
  assertEquals(result.title, "Work email");
});
