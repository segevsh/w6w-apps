import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import getIdentity from "../../actions/get-identity.ts";

Deno.test("get-identity: GETs /identity with no params", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { account: { id: 1234567, domain: "example" }, user: { id: 2 } },
  }]);
  const result = await run<{ account: { domain: string } }>(getIdentity, {}, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/identity");
  assertEquals(getIdentity.params, []);
  assertEquals(result.account.domain, "example");
});

/** `/me` would return the caller's own apiKey. This action exists to be the safe one. */

/** `/me` would return the caller's own apiKey. This action exists to be the safe one. */
Deno.test("get-identity: explains why it is not /me", () => {
  assertEquals(getIdentity.type, "read");
  assert(/account.domain|user\.id/i.test(getIdentity.description!), getIdentity.description);
});
