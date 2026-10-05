import { assert, assertEquals, assertRejects } from "@std/assert";
import updateVoucher from "../../actions/update-voucher.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updateVoucher";
const DATA = { "ok": "Y" };

Deno.test("update-voucher: calls updateVoucher with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updateVoucher.execute({ "code": "SAVE10" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "code": "SAVE10" });
  assertEquals(out, DATA);
});

Deno.test("update-voucher: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateVoucher.execute({
    "code": "SAVE10",
    "product_ids": "all",
    "valid_from": "2026-12-31 12:00:00",
    "expires_at": "2027-12-31 12:00:00",
    "first_rate": 10,
    "other_rates": 5,
    "first_amount": 3,
    "other_amounts": 2,
    "currency": "EUR",
    "is_count_limited": true,
    "count_left": 3,
    "upgrade_policy": "valid",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "code": "SAVE10",
    "product_ids": "all",
    "valid_from": "2026-12-31 12:00:00",
    "expires_at": "2027-12-31 12:00:00",
    "first_rate": "10",
    "other_rates": "5",
    "first_amount": "3",
    "other_amounts": "2",
    "currency": "EUR",
    "is_count_limited": "Y",
    "count_left": "3",
    "upgrade_policy": "valid",
  });
});

Deno.test("update-voucher: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateVoucher.execute({
    "code": "SAVE10",
    "product_ids": "all",
    "valid_from": "2026-12-31 12:00:00",
    "expires_at": "2027-12-31 12:00:00",
    "first_rate": 10,
    "other_rates": 5,
    "first_amount": 3,
    "other_amounts": 2,
    "currency": "EUR",
    "is_count_limited": true,
    "count_left": 3,
    "upgrade_policy": "valid",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-voucher: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await updateVoucher.execute({ "code": "SAVE10" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-voucher: declares idempotency as true", () => {
  assertEquals(updateVoucher.idempotent, true);
});
