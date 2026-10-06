import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-verification.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-verification: maps the lifecycle record", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        id: "vrf_1",
        sender_profile_id: "prf_1",
        channel: "sms",
        to: "+61",
        code_length: 6,
        status: "verified",
        attempts: 1,
        max_attempts: 3,
        expires_at: "e",
        verified_at: "v",
        created_at: "c",
      },
    },
  }]);
  const out = await run(action, { verificationId: "vrf_1" }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/verifications/vrf_1");
  assertEquals([out.status, out.verifiedAt, out.senderProfileId, out.maxAttempts], [
    "verified",
    "v",
    "prf_1",
    3,
  ]);
});

Deno.test("get-verification: 404 throws", async () => {
  await assertRejects(
    () =>
      run(
        action,
        { verificationId: "vrf_x" },
        mockCtx([{ status: 404, body: { error: { message: "no such verification" } } }]).ctx,
      ),
    Error,
    "no such verification",
  );
});
