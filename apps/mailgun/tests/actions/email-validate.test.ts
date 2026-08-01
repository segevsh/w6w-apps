import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-validate.ts";

Deno.test("email-validate: GETs /v4/address/validate with the address and providerLookup", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "a@b.com", is_valid: true } }]);
  const result = await action.execute!({ address: "a@b.com", providerLookup: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/address/validate");
  assertEquals(url.searchParams.get("address"), "a@b.com");
  assertEquals(url.searchParams.get("provider_lookup"), "false");
  assertEquals(result, { address: "a@b.com", is_valid: true });
});

Deno.test("email-validate: missing address rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ address: "" }, ctx), Error, "`address`");
});
