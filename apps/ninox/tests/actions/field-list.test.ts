import { assertEquals } from "@std/assert";
import { connCtx, envelope, listEnvelope, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/field-list.ts";

Deno.test("field-list: lists the fields of a table", async () => {
  const { ctx, calls } = connCtx([{ body: listEnvelope([{ name: "email" }], { has_more: true }) }]);
  const out = await action.execute({ moduleName: "crm", tableName: "contacts", offset: 25 }, ctx);
  assertEquals(out, { fields: [{ name: "email" }], hasMore: true });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/fields`);
  assertEquals(queryOf(calls[0].url), { offset: "25" });
});

Deno.test("field-list: a non-array data member yields an empty list", async () => {
  const { ctx } = connCtx([{ body: envelope(null) }]);
  const out = await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx);
  assertEquals(out.fields, []);
});
