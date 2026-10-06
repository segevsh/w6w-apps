import { assertEquals } from "@std/assert";
import { connCtx, envelope, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/module-get.ts";

Deno.test("module-get: GETs one module, encoding the name", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ name: "crm", tables: [] }) }]);
  const out = await action.execute({ moduleName: "crm" }, ctx);
  assertEquals(out.module, { name: "crm", tables: [] });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm`);
});

Deno.test("module-get: a name with a slash cannot escape its segment", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({}) }]);
  await action.execute({ moduleName: "a/b" }, ctx);
  assertEquals(calls[0].url.endsWith("/modules/a%2Fb"), true);
});
