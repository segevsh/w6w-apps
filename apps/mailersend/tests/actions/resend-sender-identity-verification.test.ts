import { assertEquals } from "@std/assert";
import action from "../../actions/resend-sender-identity-verification.ts";
import { exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("resend-sender-identity-verification: POSTs /v1/identities/{id}/resend with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await exec(action, { identityId: "i/1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/identities/i%2F1/resend");
  assertEquals(calls[0].body, null);
  assertEquals(out, { resent: true });
});
