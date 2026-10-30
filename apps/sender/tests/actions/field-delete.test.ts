import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fieldDelete from "../../actions/field-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("field-delete: DELETEs /v2/fields/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Field successfully deleted" },
  }]);
  await fieldDelete.execute({ id: "f1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/fields/f1");
});
