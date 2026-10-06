import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/field-get.ts";

Deno.test("field-get: GETs one field", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ name: "email", type: "string" }) }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", fieldName: "email" },
    ctx,
  );
  assertEquals(out.field, { name: "email", type: "string" });
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/workspace/${WS}/modules/crm/tables/contacts/fields/email`,
  );
});

Deno.test("field-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Field not found") }]);
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "crm", tableName: "contacts", fieldName: "x" }, ctx),
    Error,
    "Field not found",
  );
});
