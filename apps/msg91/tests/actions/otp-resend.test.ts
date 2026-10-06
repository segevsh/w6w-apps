import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/otp-resend.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("otp-resend: GET /otp/retry, defaults to text, honours voice", async () => {
  const { ctx, calls } = mockCtx([
    { body: { type: "success", message: "retry send successfully" } },
    { body: { type: "success", message: "retry send successfully" } },
  ]);
  const out = await action.execute({ mobile: "+919876543210" }, ctx);
  await action.execute({ mobile: "919876543210", retryType: "voice" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/otp/retry");
  assertEquals(queryOf(calls[0].url), { mobile: "919876543210", retrytype: "text" });
  assertEquals(queryOf(calls[1].url).retrytype, "voice");
  assertEquals(out, { message: "retry send successfully" });
});

Deno.test("otp-resend: the retry cap is surfaced as a failure", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "OTP retry count maxed out" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ mobile: "919876543210" }, ctx)
  ) as Error;
  assert(err.message.includes("maxed out"));
});

Deno.test("otp-resend: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "success", message: "retry send successfully" },
  }]);
  await action.execute({ mobile: "919876543210" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("otp-resend: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ mobile: "919876543210" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
