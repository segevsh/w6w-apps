import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/table-get.ts";

Deno.test("table-get: GETs one table", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ name: "contacts", hasHistory: true }) }]);
  const out = await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx);
  assertEquals(out.table, { name: "contacts", hasHistory: true });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts`);
});

Deno.test("table-get: a 401 surfaces as an error", async () => {
  const { ctx } = connCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx),
    Error,
    "HTTP 401: Unauthorized",
  );
});
