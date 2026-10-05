import { assertEquals, assertRejects } from "@std/assert";
import getVoucher from "../../actions/get-voucher.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getVoucher";
const DATA = { "ok": "Y" };

Deno.test("get-voucher: calls getVoucher with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getVoucher.execute({ "code": "SAVE10" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "code": "SAVE10" });
  assertEquals(out, DATA);
});

Deno.test("get-voucher: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getVoucher.execute({ "code": "SAVE10" }, ctx),
    Error,
    "The API key is invalid.",
  );
});
