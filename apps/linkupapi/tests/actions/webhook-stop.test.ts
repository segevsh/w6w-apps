import { assertEquals, assertRejects } from "@std/assert";
import webhookStop from "../../actions/webhook-stop.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-stop: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookStop.execute({ "webhookId": "webhookId-v" } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks/webhookId-v/stop");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-stop: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookStop.execute({ "webhookId": "webhookId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
