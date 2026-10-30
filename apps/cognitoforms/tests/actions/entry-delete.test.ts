import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

test("entry-delete: DELETEs /forms/{formId}/entries/{entryId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ formId: "42", entryId: "e1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1");
  assertEquals(result, { deleted: true });
});

test("entry-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
