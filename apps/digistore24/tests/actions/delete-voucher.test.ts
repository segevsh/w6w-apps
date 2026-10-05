import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteVoucher from "../../actions/delete-voucher.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "deleteVoucher";
const DATA = { "ok": "Y" };

Deno.test("delete-voucher: calls deleteVoucher with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await deleteVoucher.execute({ "code": "SAVE10" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "code": "SAVE10" });
  assertEquals(out, DATA);
});

Deno.test("delete-voucher: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await deleteVoucher.execute({ "code": "SAVE10" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("delete-voucher: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await deleteVoucher.execute({ "code": "SAVE10" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("delete-voucher: declares idempotency as true", () => {
  assertEquals(deleteVoucher.idempotent, true);
});
