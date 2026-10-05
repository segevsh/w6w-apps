import { assertEquals, assertRejects } from "@std/assert";
import getBuyer from "../../actions/get-buyer.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getBuyer";
const DATA = { "ok": "Y" };

Deno.test("get-buyer: calls getBuyer with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getBuyer.execute({ "buyer_id": 42 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "buyer_id": "42" });
  assertEquals(out, DATA);
});

Deno.test("get-buyer: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getBuyer.execute({ "buyer_id": 42 }, ctx),
    Error,
    "The API key is invalid.",
  );
});
