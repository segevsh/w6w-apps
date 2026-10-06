import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/function-list.ts";

Deno.test("function-list: lists global function scripts", async () => {
  const fn = { id: "f1", name: "a", moduleName: "crm", code: "function x() do 1 end" };
  const { ctx, calls } = connCtx([{ body: envelope([fn]) }]);
  const out = await action.execute({ moduleName: "crm" }, ctx);
  assertEquals(out.functions, [fn]);
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/functions`);
});

Deno.test("function-list: a 403 (missing scope) is an error", async () => {
  const { ctx } = connCtx([{ status: 403, body: errorBody("Insufficient API key scope") }]);
  await assertRejects(async () => await action.execute({ moduleName: "crm" }, ctx), Error, "scope");
});
