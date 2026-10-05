import { assertEquals, assertRejects } from "@std/assert";
import listPurchasesOfEmail from "../../actions/list-purchases-of-email.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listPurchasesOfEmail";
const DATA = { "ok": "Y" };

Deno.test("list-purchases-of-email: calls listPurchasesOfEmail with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listPurchasesOfEmail.execute({ "email": "a@b.com" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "email": "a@b.com" });
  assertEquals(out, DATA);
});

Deno.test("list-purchases-of-email: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listPurchasesOfEmail.execute({ "email": "a@b.com", "limit": 10 }, ctx);
  assertEquals(fieldsOf(calls[0]), { "email": "a@b.com", "limit": "10" });
});

Deno.test("list-purchases-of-email: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listPurchasesOfEmail.execute({ "email": "a@b.com" }, ctx),
    Error,
    "The API key is invalid.",
  );
});
