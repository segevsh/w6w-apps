import { assertEquals, assertRejects } from "@std/assert";
import getPurchase from "../../actions/get-purchase.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getPurchase";
const DATA = { "ok": "Y" };

Deno.test("get-purchase: calls getPurchase with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getPurchase.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN" });
  assertEquals(out, DATA);
});

Deno.test("get-purchase: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getPurchase.execute({ "purchase_id": "X26QE8GN" }, ctx),
    Error,
    "The API key is invalid.",
  );
});
