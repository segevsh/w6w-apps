import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/question-get-many.ts";

Deno.test("question-get-many: GETs the form's questions", async () => {
  const { ctx, calls } = mockCtx([
    { body: { questions: [{ id: "q1", title: "Email" }], hasResponses: true } },
  ]);
  const result = await action.execute({ formId: "f1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/questions");
  assertEquals(result.questions, [{ id: "q1", title: "Email" }]);
  assertEquals(result.hasResponses, true);
  assertEquals(result.count, 1);
});

Deno.test("question-get-many: tolerates a body without a questions array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({ formId: "f1" }, ctx);
  assertEquals(result.questions, []);
  assertEquals(result.count, 0);
});
