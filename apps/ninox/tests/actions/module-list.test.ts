import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, errorBody, listEnvelope, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/module-list.ts";

Deno.test("module-list: lists modules with paging", async () => {
  const { ctx, calls } = connCtx([{ body: listEnvelope([{ name: "crm" }], { has_more: true }) }]);
  const out = await action.execute({ limit: 10, offset: 20 }, ctx);
  assertEquals(out, { modules: [{ name: "crm" }], hasMore: true });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules`);
  assertEquals(queryOf(calls[0].url), { limit: "10", offset: "20" });
});

Deno.test("module-list: omits unset paging params", async () => {
  const { ctx, calls } = connCtx([{ body: listEnvelope([]) }]);
  await action.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("module-list: a 404 names the vendor message", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Workspace not found") }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "Workspace not found");
});
