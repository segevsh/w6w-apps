import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/script-exec.ts";

Deno.test("script-exec: POSTs module, script, table and rowId and returns the result", async () => {
  const { ctx, calls } = connCtx([{ body: envelope(42) }]);
  const out = await action.execute(
    { moduleName: "crm", script: "1+41", tableName: "contacts", rowId: 3 },
    ctx,
  );
  assertEquals(out.result, 42);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/script/exec`);
  assertEquals(JSON.parse(calls[0].body!), {
    moduleName: "crm",
    script: "1+41",
    tableName: "contacts",
    rowId: 3,
  });
  assertEquals(action.idempotent, false);
});

Deno.test("script-exec: omits table and row when unset, and keeps a null result", async () => {
  const { ctx, calls } = connCtx([{ body: envelope(null) }]);
  const out = await action.execute({ moduleName: "crm", script: "null" }, ctx);
  assertEquals(out.result, null);
  assertEquals(JSON.parse(calls[0].body!), { moduleName: "crm", script: "null" });
});

Deno.test("script-exec: a blank script is rejected locally; a 403 is an error", async () => {
  const { ctx, calls } = connCtx([{ status: 403, body: errorBody("Insufficient API key scope") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", script: "  " }, ctx),
    Error,
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", script: "1" }, ctx),
    Error,
    "scope",
  );
});
