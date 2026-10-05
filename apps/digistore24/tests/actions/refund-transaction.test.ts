import { assert, assertEquals, assertRejects } from "@std/assert";
import refundTransaction from "../../actions/refund-transaction.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "refundTransaction";
const DATA = { "ok": "Y" };

Deno.test("refund-transaction: calls refundTransaction with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await refundTransaction.execute({ "transaction_id": "T99" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "transaction_id": "T99" });
  assertEquals(out, DATA);
});

Deno.test("refund-transaction: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await refundTransaction.execute({
    "transaction_id": "T99",
    "force": true,
    "request_date": "2026-10-01",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "transaction_id": "T99",
    "force": "Y",
    "request_date": "2026-10-01",
  });
});

Deno.test("refund-transaction: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await refundTransaction.execute({
    "transaction_id": "T99",
    "force": true,
    "request_date": "2026-10-01",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("refund-transaction: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await refundTransaction.execute({ "transaction_id": "T99" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("refund-transaction: declares idempotency as false", () => {
  assertEquals(refundTransaction.idempotent, false);
});
