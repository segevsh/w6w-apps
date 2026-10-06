import { assertEquals, assertRejects } from "@std/assert";
import emailReverse from "../../actions/email-reverse.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("email-reverse: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await emailReverse.execute({ "email": "email-v" } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/enrich");
  assertEquals(JSON.parse(calls[0].body!), {
    "action": "reverse_email",
    "params": { "email": "email-v" },
  });
});

Deno.test("email-reverse: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await emailReverse.execute({ "email": "email-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
