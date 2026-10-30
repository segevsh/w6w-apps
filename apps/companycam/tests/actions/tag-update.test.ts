import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tagUpdate from "../../actions/tag-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("tag-update: renames a tag everywhere it is used", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await tagUpdate.execute({ tagId: "1", displayValue: "Rear Side" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tags/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { tag: { display_value: "Rear Side" } });
  assertEquals(tagUpdate.idempotent, true);
});
