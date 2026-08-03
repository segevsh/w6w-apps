import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get.ts";

Deno.test("submission-get: GETs one submission with its question set", async () => {
  const { ctx, calls } = mockCtx([
    { body: { questions: [{ id: "q1" }], submission: { id: "s1", isCompleted: true } } },
  ]);
  const result = await action.execute({ formId: "f1", submissionId: "s1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/submissions/s1");
  assertEquals(result.submission, { id: "s1", isCompleted: true });
  assertEquals(result.questions, [{ id: "q1" }]);
});

Deno.test("submission-get: defaults questions to an empty array", async () => {
  const { ctx } = mockCtx([{ body: { submission: { id: "s1" } } }]);
  const result = await action.execute({ formId: "f1", submissionId: "s1" }, ctx);
  assertEquals(result.questions, []);
});
