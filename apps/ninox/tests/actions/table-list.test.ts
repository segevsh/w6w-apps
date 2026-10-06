import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, errorBody, listEnvelope, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/table-list.ts";

Deno.test("table-list: lists tables of a module", async () => {
  const { ctx, calls } = connCtx([{ body: listEnvelope([{ name: "contacts" }]) }]);
  const out = await action.execute({ moduleName: "crm", limit: 5 }, ctx);
  assertEquals(out, { tables: [{ name: "contacts" }], hasMore: false });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables`);
  assertEquals(queryOf(calls[0].url), { limit: "5" });
});

Deno.test("table-list: an unknown module is a 404 error", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Module not found") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "x" }, ctx),
    Error,
    "Module not found",
  );
});
