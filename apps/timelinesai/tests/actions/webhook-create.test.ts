import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhookCreate from "../../actions/webhook-create.ts";

Deno.test("webhook-create: creates the subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "id": 1 } } }]);
  const out = await webhookCreate.execute!(
    { "eventType": "message:received:new", "url": "https://x.test/h", "enabled": true } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    "event_type": "message:received:new",
    "url": "https://x.test/h",
    "enabled": true,
  });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("webhook-create: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await webhookCreate.execute!(
      { "eventType": "message:received:new", "url": "https://x.test/h", "enabled": true } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
