import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhookUpdate from "../../actions/webhook-update.ts";

Deno.test("webhook-update: PUTs only the supplied fields, keeping enabled=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "id": 12 } } }]);
  const out = await webhookUpdate.execute!({ "webhookId": "12", "enabled": false } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/webhooks/12");
  assertEquals(JSON.parse(calls[0].body!), { "enabled": false });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("webhook-update: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await webhookUpdate.execute!({ "webhookId": "12", "enabled": false } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("webhook-update: refuses an update that changes nothing, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await webhookUpdate.execute!({ webhookId: "12" } as never, ctx);
  }, Error);
  assertEquals(calls.length, 0);
});
