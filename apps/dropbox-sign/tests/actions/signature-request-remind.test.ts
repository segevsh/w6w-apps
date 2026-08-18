import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-remind.ts";

/** A reminder targets a person, not the request. */
Deno.test("remind: addresses one signer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { signature_request: {} } }]);
  await action.execute!({ signatureRequestId: "sr1", emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/remind/sr1");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("remind: the name is only sent when given, and the email is required", async () => {
  const named = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { signatureRequestId: "sr1", emailAddress: "ada@example.com", name: "Ada" },
    named.ctx,
  );
  assertEquals(JSON.parse(named.calls[0].body!).name, "Ada");

  const missing = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ signatureRequestId: "sr1" }, missing.ctx),
    Error,
    "`emailAddress` is required",
  );
  assertEquals(missing.calls.length, 0);
});

Deno.test("remind: sends a second email on a retry, and says so", () => {
  assertEquals(action.idempotent, false);
});
