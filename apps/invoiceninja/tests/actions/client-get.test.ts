import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

test("client-get: GETs /clients/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "abc", name: "Bob & Co" } }]);
  const out = await action.execute({ clientId: "abc" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/clients/abc");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "abc", name: "Bob & Co" });
});
