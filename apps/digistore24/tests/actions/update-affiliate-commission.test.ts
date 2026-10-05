import { assert, assertEquals, assertRejects } from "@std/assert";
import updateAffiliateCommission from "../../actions/update-affiliate-commission.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updateAffiliateCommission";
const DATA = { "ok": "Y" };

Deno.test("update-affiliate-commission: calls updateAffiliateCommission with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updateAffiliateCommission.execute({
    "affiliate_id": "aff1",
    "product_ids": "1,2",
  }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "affiliate_id": "aff1", "product_ids": "1,2" });
  assertEquals(out, DATA);
});

Deno.test("update-affiliate-commission: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateAffiliateCommission.execute({
    "affiliate_id": "aff1",
    "product_ids": "1,2",
    "commission_rate": 30,
    "commission_fix": 5,
    "commission_currency": "EUR",
    "is_on_first_pmnt_only": true,
    "approval_status": "approved",
    "can_overpay": "Y",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "affiliate_id": "aff1",
    "product_ids": "1,2",
    "data[commission_rate]": "30",
    "data[commission_fix]": "5",
    "data[commission_currency]": "EUR",
    "data[is_on_first_pmnt_only]": "Y",
    "data[approval_status]": "approved",
    "data[can_overpay]": "Y",
  });
});

Deno.test("update-affiliate-commission: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateAffiliateCommission.execute({
    "affiliate_id": "aff1",
    "product_ids": "1,2",
    "commission_rate": 30,
    "commission_fix": 5,
    "commission_currency": "EUR",
    "is_on_first_pmnt_only": true,
    "approval_status": "approved",
    "can_overpay": "Y",
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-affiliate-commission: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () =>
      await updateAffiliateCommission.execute(
        { "affiliate_id": "aff1", "product_ids": "1,2" },
        ctx,
      ),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-affiliate-commission: declares idempotency as true", () => {
  assertEquals(updateAffiliateCommission.idempotent, true);
});
