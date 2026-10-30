import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import verifyVerificationCreate from "../../actions/verify-verification-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("verify-verification-create: POSTs to /api/v2/verify/services/{sid}/verifications", async () => {
  const { ctx, calls } = mockCtx([{
    body: { sid: "VR1", status: "pending", delivery_target: { code: "123456" } },
  }]);
  const out = await verifyVerificationCreate.execute(
    { serviceSid: "SV1", to: "+14155551212" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/verify/services/SV1/verifications");
  assertEquals(jsonBodyOf(calls[0]), { to: "+14155551212" });
  assertEquals(out.status, "pending");
});
