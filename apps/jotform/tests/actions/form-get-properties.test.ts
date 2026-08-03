import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-properties.ts";

Deno.test("form-get-properties: GETs every property when no key is given", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ formWidth: "690", styles: "nova" }) }]);
  const result = await action.execute({ formId: "31774828724868" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/form/31774828724868/properties");
  assertEquals(result, { properties: { formWidth: "690", styles: "nova" } });
});

Deno.test("form-get-properties: a property key selects the single-property endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("690") }]);
  const result = await action.execute(
    { formId: "31774828724868", propertyKey: "formWidth" },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/form/31774828724868/properties/formWidth");
  assertEquals(result, { properties: "690" });
});
