import { assertEquals } from "@std/assert";
import getFormField from "../../actions/get-form-field.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-form-field: GETs /v1/forms/{slugOrId}/fields/{fieldKey}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ field: { key: "3jbh8", title: "Name" } }),
  }]);
  const out = await getFormField.execute({ slugOrId: "f1", fieldKey: "3jbh8" }, ctx) as {
    field?: { key?: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/fields/3jbh8");
  assertEquals(out.field?.key, "3jbh8");
});
