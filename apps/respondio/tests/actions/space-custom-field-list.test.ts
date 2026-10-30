import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import spaceCustomFieldList from "../../actions/space-custom-field-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("space-custom-field-list: GETs /space/custom_field", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "Plan" }]) }]);
  const out = await spaceCustomFieldList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/space/custom_field");
  assertEquals(out.items.length, 1);
});
