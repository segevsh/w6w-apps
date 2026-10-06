import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-delete: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookDelete.execute({ "webhookId": "webhookId-v" } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks/webhookId-v");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-delete: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookDelete.execute({ "webhookId": "webhookId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
