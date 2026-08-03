import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-delete-item.ts";

Deno.test("form-delete-item: sends deleteItem with a Location", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({ formId: "f1", index: 2 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/f1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ deleteItem: { location: { index: 2 } } }],
  });
});

Deno.test("form-delete-item: normalises a pasted editor URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { formId: "https://docs.google.com/forms/d/zz-99/edit#responses", index: 0 },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/zz-99:batchUpdate");
});

Deno.test("form-delete-item: deleting by position is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
