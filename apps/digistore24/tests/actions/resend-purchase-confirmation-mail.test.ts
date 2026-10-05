import { assert, assertEquals, assertRejects } from "@std/assert";
import resendPurchaseConfirmationMail from "../../actions/resend-purchase-confirmation-mail.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "resendPurchaseConfirmationMail";
const DATA = { "ok": "Y" };

Deno.test("resend-purchase-confirmation-mail: calls resendPurchaseConfirmationMail with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await resendPurchaseConfirmationMail.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN" });
  assertEquals(out, DATA);
});

Deno.test("resend-purchase-confirmation-mail: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await resendPurchaseConfirmationMail.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("resend-purchase-confirmation-mail: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await resendPurchaseConfirmationMail.execute({ "purchase_id": "X26QE8GN" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("resend-purchase-confirmation-mail: declares idempotency as false", () => {
  assertEquals(resendPurchaseConfirmationMail.idempotent, false);
});
