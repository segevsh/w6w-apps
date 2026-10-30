import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/delete-field.ts";
import { mockCtx } from "../_helpers.ts";

test("delete-field: DELETEs /lists/{id}/fields/{tag}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ listId: "l1", tag: "Hometown" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/fields/Hometown");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

test("delete-field: is a perform action declaring idempotency", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
