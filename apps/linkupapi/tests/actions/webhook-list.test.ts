import { assertEquals, assertRejects } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookList.execute({} as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookList.execute({} as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
