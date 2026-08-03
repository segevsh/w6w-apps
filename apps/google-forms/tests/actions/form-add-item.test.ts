import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-add-item.ts";

Deno.test("form-add-item: wraps createItem with a Location", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ createItem: { itemId: "i1" } }] } }]);
  const item = {
    title: "Your name",
    questionItem: { question: { required: true, textQuestion: {} } },
  };
  const result = await action.execute({ formId: "f1", item, index: 0 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/f1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ createItem: { item, location: { index: 0 } } }],
  });
  assertEquals(result, { replies: [{ createItem: { itemId: "i1" } }] });
});

Deno.test("form-add-item: passes includeFormInResponse through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", item: {}, index: 3, includeFormInResponse: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeFormInResponse, true);
});

Deno.test("form-add-item: inserting is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
