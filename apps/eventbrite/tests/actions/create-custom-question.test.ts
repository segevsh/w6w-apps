import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-custom-question.ts";

Deno.test("create-custom-question: POST wrapped question", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9" } }]);
  await action.execute!(
    {
      eventId: "1",
      text: "Diet?",
      type: "dropdown",
      respondent: "attendee",
      required: true,
      choices: ["Veg", "Vegan"],
      ticketClassIds: ["t1"],
      extra: { sorting: 5 },
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/questions/");
  assertEquals(JSON.parse(calls[0].body!), {
    question: {
      question: { html: "Diet?" },
      type: "dropdown",
      respondent: "attendee",
      required: true,
      choices: [{ answer: { html: "Veg" } }, { answer: { html: "Vegan" } }],
      ticket_classes: [{ id: "t1" }],
      sorting: 5,
    },
  });
});
