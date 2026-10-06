import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/report-list.ts";

Deno.test("report-list: lists reports of a table", async () => {
  const { ctx, calls } = connCtx([{ body: envelope([{ id: "r1", name: "Invoice" }]) }]);
  const out = await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx);
  assertEquals(out.reports, [{ id: "r1", name: "Invoice" }]);
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/reports`);
});

Deno.test("report-list: a 401 is an error", async () => {
  const { ctx } = connCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", tableName: "contacts" }, ctx),
    Error,
    "401",
  );
});
