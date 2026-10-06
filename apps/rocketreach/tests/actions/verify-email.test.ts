import { assertEquals, assertRejects } from "@std/assert";
import verifyEmail from "../../actions/verify-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("verify-email: POSTs the email as JSON and maps the verdict", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      email: "a@b.co",
      status: "valid",
      credits_charged: 1,
      mx_record: "mx.b.co",
      checks: { format_valid: true, domain_valid: true, disposable: false, catchall: false },
    },
  }]);
  const out = await run(verifyEmail, { email: " a@b.co " }, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/email/verify/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co" });
  assertEquals([out.status, out.creditsCharged, out.mxRecord], ["valid", 1, "mx.b.co"]);
  assertEquals(out.checks.disposable, false);
});

Deno.test("verify-email: unknown is free; an empty email is refused", async () => {
  const { ctx } = mockCtx([{ body: { email: "a@b.co", status: "unknown", credits_charged: 0 } }]);
  assertEquals((await run(verifyEmail, { email: "a@b.co" }, ctx)).creditsCharged, 0);
  const none = mockCtx();
  await assertRejects(() => run(verifyEmail, { email: " " }, none.ctx), Error, "Email is required");
  assertEquals(none.calls.length, 0);
});

Deno.test("verify-email: a 402 names the credit type and is not retried", async () => {
  const bad = mockCtx([{
    status: 402,
    body: {
      detail: "You do not have enough Email Verification credits",
      error_code: 202,
      credit_type: "email_verification",
    },
  }]);
  await assertRejects(
    () => run(verifyEmail, { email: "a@b.co" }, bad.ctx),
    Error,
    "credit_type email_verification",
  );
  assertEquals(bad.calls.length, 1);
});
