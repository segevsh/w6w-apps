import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/view-list.ts";

Deno.test("view-list: lists views of a table", async () => {
  const { ctx, calls } = connCtx([{ body: envelope([{ id: "v1" }]) }]);
  const out = await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx);
  assertEquals(out.views, [{ id: "v1" }]);
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/views`);
});

Deno.test("view-list: a 404 is an error", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Table not found") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", tableName: "x" }, ctx),
    Error,
    "Table not found",
  );
});
