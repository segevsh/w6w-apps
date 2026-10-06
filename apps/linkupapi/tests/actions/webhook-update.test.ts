import { assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-update: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookUpdate.execute(
    {
      "webhookId": "webhookId-v",
      "url": "url-v",
      "events": "a; b",
      "retry": true,
      "isActive": true,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks/webhookId-v");
  assertEquals(JSON.parse(calls[0].body!), {
    "url": "url-v",
    "events": ["a", "b"],
    "retry": true,
    "is_active": true,
  });
});

Deno.test("webhook-update: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await webhookUpdate.execute({ "webhookId": "webhookId-v" } as never, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks/webhookId-v");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("webhook-update: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookUpdate.execute({ "webhookId": "webhookId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
