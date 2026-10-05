import { assert, assertEquals, assertRejects } from "@std/assert";
import ipnSetup from "../../actions/ipn-setup.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "ipnSetup";
const DATA = { "ok": "Y" };

Deno.test("ipn-setup: calls ipnSetup with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await ipnSetup.execute({
    "ipn_url": "https://x.test/ipn",
    "name": "w6w",
    "product_ids": "all",
  }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), {
    "ipn_url": "https://x.test/ipn",
    "name": "w6w",
    "product_ids": "all",
  });
  assertEquals(out, DATA);
});

Deno.test("ipn-setup: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await ipnSetup.execute({
    "ipn_url": "https://x.test/ipn",
    "name": "w6w",
    "product_ids": "all",
    "domain_id": "w6w",
    "categories": "orders",
    "transactions": "payment,refund",
    "timing": "delayed",
    "sha_passphrase": "s3cret",
    "newsletter_send_policy": "end_if_optin",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "ipn_url": "https://x.test/ipn",
    "name": "w6w",
    "product_ids": "all",
    "domain_id": "w6w",
    "categories": "orders",
    "transactions": "payment,refund",
    "timing": "delayed",
    "sha_passphrase": "s3cret",
    "newsletter_send_policy": "end_if_optin",
  });
});

Deno.test("ipn-setup: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await ipnSetup.execute({
    "ipn_url": "https://x.test/ipn",
    "name": "w6w",
    "product_ids": "all",
    "domain_id": "w6w",
    "categories": "orders",
    "transactions": "payment,refund",
    "timing": "delayed",
    "sha_passphrase": "s3cret",
    "newsletter_send_policy": "end_if_optin",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("ipn-setup: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () =>
      await ipnSetup.execute({
        "ipn_url": "https://x.test/ipn",
        "name": "w6w",
        "product_ids": "all",
      }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("ipn-setup: declares idempotency as true", () => {
  assertEquals(ipnSetup.idempotent, true);
});
