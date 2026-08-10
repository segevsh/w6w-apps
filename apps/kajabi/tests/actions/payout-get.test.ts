import { assertEquals } from "@std/assert";
import payoutGet from "../../actions/payout-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payout-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await payoutGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/kajabi_payments_payouts/7");
});

Deno.test("payout-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await payoutGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/kajabi_payments_payouts/a%2Fb");
});

Deno.test("payout-get: sends no fieldset or include — the spec declares neither", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await payoutGet.execute({ id: "7" }, ctx);
  assertEquals(queryOf(calls[0]), {});
});
