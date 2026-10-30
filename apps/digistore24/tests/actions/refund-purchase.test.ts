import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import refundPurchase from "../../actions/refund-purchase.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "refundPurchase";
const DATA = { "ok": "Y" };

test("refund-purchase: calls refundPurchase with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await refundPurchase.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN" });
  assertEquals(out, DATA);
});

test("refund-purchase: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await refundPurchase.execute({
    "purchase_id": "X26QE8GN",
    "force": true,
    "request_date": "2026-10-01",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "purchase_id": "X26QE8GN",
    "force": "Y",
    "request_date": "2026-10-01",
  });
});

test("refund-purchase: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await refundPurchase.execute({
    "purchase_id": "X26QE8GN",
    "force": true,
    "request_date": "2026-10-01",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

test("refund-purchase: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await refundPurchase.execute({ "purchase_id": "X26QE8GN" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

test("refund-purchase: declares idempotency as false", () => {
  assertEquals(refundPurchase.idempotent, false);
});
