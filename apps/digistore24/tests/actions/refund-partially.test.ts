import { assert, assertEquals, assertRejects } from "@std/assert";
import refundPartially from "../../actions/refund-partially.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "refundPartially";
const DATA = { "ok": "Y" };

Deno.test("refund-partially: calls refundPartially with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await refundPartially.execute({ "purchase_id": "X26QE8GN", "amount": 5.5 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN", "amount": "5.5" });
  assertEquals(out, DATA);
});

Deno.test("refund-partially: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await refundPartially.execute({ "purchase_id": "X26QE8GN", "amount": 5.5 }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("refund-partially: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await refundPartially.execute({ "purchase_id": "X26QE8GN", "amount": 5.5 }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("refund-partially: declares idempotency as false", () => {
  assertEquals(refundPartially.idempotent, false);
});
