import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/get-field.ts";

Deno.test("get-field: puts the field in the path and the table in the query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: 9, label: "Email" } }]);
  const out = await action.execute({ tableId: "bck1", fieldId: 9 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/fields/9");
  assertEquals(url.searchParams.get("tableId"), "bck1");
  assertEquals(out.label, "Email");
});

Deno.test("get-field: returns type-specific settings under `properties`", async () => {
  const { ctx } = mockQbCtx([{
    body: { id: 12, fieldType: "formula", properties: { formula: "[a]*[b]", decimalPlaces: 2 } },
  }]);
  const out = await action.execute({ tableId: "bck1", fieldId: 12 }, ctx);
  assertEquals(out.properties!.formula, "[a]*[b]");
});
