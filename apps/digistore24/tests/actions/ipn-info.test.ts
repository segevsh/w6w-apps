import { assertEquals, assertRejects } from "@std/assert";
import ipnInfo from "../../actions/ipn-info.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "ipnInfo";
const DATA = { "ok": "Y" };

Deno.test("ipn-info: calls ipnInfo with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await ipnInfo.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("ipn-info: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await ipnInfo.execute({ "domain_id": "w6w" }, ctx);
  assertEquals(fieldsOf(calls[0]), { "domain_id": "w6w" });
});

Deno.test("ipn-info: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(async () => await ipnInfo.execute({}, ctx), Error, "The API key is invalid.");
});
