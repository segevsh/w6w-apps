import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-update.ts";

/** signature_id is the SIGNER's id — a different id from the request's. */
Deno.test("update: requires the signer's id and something to change", async () => {
  const noSignature = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { signatureRequestId: "sr1", emailAddress: "b@x.com" },
        noSignature.ctx,
      ),
    Error,
    "`signatureId` is required",
  );

  const nothing = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ signatureRequestId: "sr1", signatureId: "sg1" }, nothing.ctx),
    Error,
    "nothing to update",
  );
  assertEquals(noSignature.calls.length + nothing.calls.length, 0);
});

Deno.test("update: sends the signature id alongside the change", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { signature_request: {} } }]);
  await action.execute!({
    signatureRequestId: "sr1",
    signatureId: "sg1",
    emailAddress: "new@example.com",
  }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/update/sr1");
  assertEquals(JSON.parse(calls[0].body!), {
    signature_id: "sg1",
    email_address: "new@example.com",
  });
});

Deno.test("update: an expiry is sent as a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    signatureRequestId: "sr1",
    signatureId: "sg1",
    expiresAt: "1790000000",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).expires_at, 1790000000);
});
