import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-create: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookCreate.execute(
    {
      "accountId": "accountId-v",
      "url": "url-v",
      "events": "a; b",
      "retry": true,
      "enableSignature": true,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "url": "url-v",
    "events": ["a", "b"],
    "retry": true,
    "enable_signature": true,
  });
});

Deno.test("webhook-create: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await webhookCreate.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { "account_id": "accountId-v" });
});

Deno.test("webhook-create: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookCreate.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
