import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/resend-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("resend-email: POSTs to the resend path and returns the new reference id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { reference_id: "abc123def456" } } }]);
  const out = await run(action, { messageId: "m1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/logs/email/m1/resend");
  assertEquals(out, { referenceId: "abc123def456" });
});

Deno.test("resend-email: the daily resend limit (429) throws", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: { message: "daily resend limit" } } }]);
  await assertRejects(() => run(action, { messageId: "m1" }, ctx), Error, "daily resend limit");
});
