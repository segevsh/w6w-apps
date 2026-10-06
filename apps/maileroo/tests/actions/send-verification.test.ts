import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-verification.ts";
import { mockCtx, run } from "../_helpers.ts";

const created = {
  id: "vrf_0123456789abcdef01234567",
  sender_profile_id: "prf_1",
  channel: "sms",
  to: "+61412345678",
  country: "AU",
  code_length: 6,
  status: "pending",
  attempts: 0,
  max_attempts: 3,
  expires_at: "2025-01-01T12:15:00Z",
};

Deno.test("send-verification: POSTs the vendor body, forwards the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: created } }], {
    invocation: { invocationId: "inv-42" },
  });
  const out = await run(action, {
    senderProfileId: "prf_1",
    channel: "sms",
    to: "+61412345678",
    codeLength: 6,
    expiresIn: 900,
  }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/verifications");
  assertEquals(calls[0].headers["idempotency-key"], "inv-42");
  assertEquals(JSON.parse(calls[0].body!), {
    sender_profile_id: "prf_1",
    channel: "sms",
    to: "+61412345678",
    code_length: 6,
    expires_in: 900,
  });
  assertEquals([out.id, out.status, out.maxAttempts, out.country], [
    created.id,
    "pending",
    3,
    "AU",
  ]);
  assertEquals("code" in out, false);
});

Deno.test("send-verification: no invocation means no idempotency header; a bad channel throws; 402 surfaces", async () => {
  const { ctx, calls } = mockCtx([{
    status: 402,
    body: { error: { message: "Your OTP Verification balance is too low." } },
  }]);
  await assertRejects(
    () => run(action, { senderProfileId: "p", channel: "pigeon", to: "x" }, ctx),
    Error,
    "channel must be one of",
  );
  await assertRejects(
    () => run(action, { senderProfileId: "p", channel: "email", to: "a@x.com" }, ctx),
    Error,
    "balance is too low",
  );
  assertEquals(calls[0].headers["idempotency-key"], undefined);
});
