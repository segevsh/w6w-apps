import { assert, assertEquals, assertRejects } from "@std/assert";
import ipnDelete from "../../actions/ipn-delete.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "ipnDelete";
const DATA = { "ok": "Y" };

Deno.test("ipn-delete: calls ipnDelete with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await ipnDelete.execute({ "domain_id": "w6w" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "domain_id": "w6w" });
  assertEquals(out, DATA);
});

Deno.test("ipn-delete: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await ipnDelete.execute({ "domain_id": "w6w" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("ipn-delete: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await ipnDelete.execute({ "domain_id": "w6w" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("ipn-delete: declares idempotency as true", () => {
  assertEquals(ipnDelete.idempotent, true);
});
