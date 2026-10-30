import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import spaceCustomFieldGet from "../../actions/space-custom-field-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("space-custom-field-get: GETs /space/custom_field/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Plan", dataType: "text" } }]);
  const out = await spaceCustomFieldGet.execute({ id: 3 }, ctx) as { id: number };

  assertEquals(pathOf(calls[0].url), "/v2/space/custom_field/3");
  assertEquals(out.id, 3);
});
