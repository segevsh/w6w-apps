import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-questions.ts";

Deno.test("form-get-questions: GETs /form/{formID}/questions, keyed by qid", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        "1": { qid: "1", type: "control_textbox", text: "Textbox Example" },
        "2": { qid: "2", type: "control_fullname", text: "Full Name" },
      }),
    },
  ]);
  const result = await action.execute({ formId: "31774828724868" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/form/31774828724868/questions");
  assertEquals(Object.keys((result as { questions: object }).questions), ["1", "2"]);
});

Deno.test("form-get-questions: an empty content falls back to an empty map", async () => {
  const { ctx } = mockCtx([{ body: envelope(undefined) }]);
  assertEquals(await action.execute({ formId: "1" }, ctx), { questions: {} });
});
