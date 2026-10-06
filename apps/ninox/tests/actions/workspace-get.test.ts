import { assertEquals, assertRejects } from "@std/assert";
import { API_ROOT, connCtx, envelope, WS } from "../_helpers.ts";
import action from "../../actions/workspace-get.ts";

Deno.test("workspace-get: GETs the workspace and returns data", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ name: "Acme", modules: [] }) }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.workspace, { name: "Acme", modules: [] });
  assertEquals(calls[0].url, `${API_ROOT}/workspace/${WS}`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("workspace-get: an HTML 200 is not an API response", async () => {
  const { ctx } = connCtx([{ body: "<!doctype html><html></html>", headers: {} }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "not an API response");
});

Deno.test("workspace-get: no workspace id on the connection fails loudly", async () => {
  const { ctx } = connCtx();
  (ctx as { connection?: unknown }).connection = { display: {} };
  await assertRejects(async () => await action.execute({}, ctx), Error, "no workspace id");
});

Deno.test("workspace-get: a text 401 surfaces the status and text", async () => {
  const { ctx } = connCtx([{ status: 401, body: "Workspace orchestrator error", headers: {} }]);
  await assertRejects(
    async () => await action.execute({}, ctx),
    Error,
    "HTTP 401: Workspace orchestrator",
  );
});
