import { assertEquals, assertRejects } from "@std/assert";
import getAffiliateCommission from "../../actions/get-affiliate-commission.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getAffiliateCommission";
const DATA = { "ok": "Y" };

Deno.test("get-affiliate-commission: calls getAffiliateCommission with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getAffiliateCommission.execute({ "affiliate_id": "aff1" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "affiliate_id": "aff1" });
  assertEquals(out, DATA);
});

Deno.test("get-affiliate-commission: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await getAffiliateCommission.execute({ "affiliate_id": "aff1", "product_ids": "1,2" }, ctx);
  assertEquals(fieldsOf(calls[0]), { "affiliate_id": "aff1", "product_ids": "1,2" });
});

Deno.test("get-affiliate-commission: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getAffiliateCommission.execute({ "affiliate_id": "aff1" }, ctx),
    Error,
    "The API key is invalid.",
  );
});
