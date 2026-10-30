import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import boxFieldValueUpdate from "../../actions/box-field-value-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("box-field-value-update: POSTs { value }", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "1003", value: "Developer" } }]);
  await boxFieldValueUpdate.execute({ boxKey: "b1", fieldKey: "1003", value: "Developer" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1/fields/1003");
  assertEquals(JSON.parse(calls[0].body!), { value: "Developer" });
});
