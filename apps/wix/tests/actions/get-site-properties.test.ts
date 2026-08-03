import { assertEquals } from "@std/assert";
import action from "../../actions/get-site-properties.ts";
import { mockCtx } from "../_helpers.ts";
import { SCOPE_HEADER } from "../../lib/client.ts";

Deno.test("get-site-properties: GETs /site-properties/v4/properties", async () => {
  const body = { properties: { siteDisplayName: "My Site", locale: "en-US" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/site-properties/v4/properties");
  assertEquals(out, body);
});

Deno.test("get-site-properties: is site-scoped — this one needs wix-site-id, not wix-account-id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].headers[SCOPE_HEADER], "site");
});

Deno.test("get-site-properties: is a read action taking no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
});
