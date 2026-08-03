import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-move-item.ts";

Deno.test("form-move-item: sends originalLocation and newLocation", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({ formId: "f1", originalIndex: 3, newIndex: 0 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/f1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      moveItem: { originalLocation: { index: 3 }, newLocation: { index: 0 } },
    }],
  });
});

Deno.test("form-move-item: index 0 survives the envelope (not dropped as falsy)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", originalIndex: 0, newIndex: 2 }, ctx);
  const req = JSON.parse(calls[0].body!).requests[0].moveItem;
  assertEquals(req.originalLocation.index, 0);
});

Deno.test("form-move-item: reordering by position is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
