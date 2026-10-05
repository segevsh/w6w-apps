import { assert, assertEquals, assertRejects } from "@std/assert";
import updatePurchase from "../../actions/update-purchase.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updatePurchase";
const DATA = { "ok": "Y" };

Deno.test("update-purchase: calls updatePurchase with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updatePurchase.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN" });
  assertEquals(out, DATA);
});

Deno.test("update-purchase: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updatePurchase.execute({
    "purchase_id": "X26QE8GN",
    "tracking_param": "tk1",
    "custom": "c1",
    "unlock_invoices": true,
    "next_payment_at": "2026-12-31 12:00:00",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "purchase_id": "X26QE8GN",
    "tracking_param": "tk1",
    "custom": "c1",
    "unlock_invoices": "Y",
    "next_payment_at": "2026-12-31 12:00:00",
  });
});

Deno.test("update-purchase: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updatePurchase.execute({
    "purchase_id": "X26QE8GN",
    "tracking_param": "tk1",
    "custom": "c1",
    "unlock_invoices": true,
    "next_payment_at": "2026-12-31 12:00:00",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-purchase: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await updatePurchase.execute({ "purchase_id": "X26QE8GN" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-purchase: declares idempotency as true", () => {
  assertEquals(updatePurchase.idempotent, true);
});
