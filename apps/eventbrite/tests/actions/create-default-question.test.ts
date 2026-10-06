import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-default-question.ts";

Deno.test("create-default-question: POST wrapped question with extra merge", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "email" } }]);
  await action.execute!(
    {
      eventId: "1",
      cannedType: "email",
      text: "Your email",
      required: true,
      choices: ["a"],
      extra: { type: "text" },
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/canned_questions/");
  assertEquals(JSON.parse(calls[0].body!), {
    question: {
      canned_type: "email",
      question: { html: "Your email" },
      required: true,
      choices: [{ answer: { html: "a" } }],
      type: "text",
    },
  });
});
