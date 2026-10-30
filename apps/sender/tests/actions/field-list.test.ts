import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fieldList from "../../actions/field-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("field-list: GETs /v2/fields and returns the body untouched", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { id: null, title: "Phone number", type: "text" }, meta: { total: 8 } } },
  ]);
  const out = await fieldList.execute({}, ctx) as { data: unknown; meta: { total: number } };

  assertEquals(pathOf(calls[0].url), "/v2/fields");
  assertEquals(out.meta.total, 8);
});
