import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-default-question.ts";

Deno.test("update-default-question: POST wrapped question to id path", async () => {
  const { ctx, calls } = mockCtx([{ body: { question: {} } }]);
  await action.execute!({ eventId: "1", questionId: "email", required: false, text: "T" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/canned_questions/email/");
  assertEquals(JSON.parse(calls[0].body!), {
    question: { question: { html: "T" }, required: false },
  });
});
