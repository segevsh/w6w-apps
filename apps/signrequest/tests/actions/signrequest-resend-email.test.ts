import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import signrequestResendEmail from "../../actions/signrequest-resend-email.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("signrequest-resend-email: POSTs /signrequests/{id}/resend_signrequest_email/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await signrequestResendEmail.execute({ signrequestId: "sr-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/sr-1/resend_signrequest_email/");
});
