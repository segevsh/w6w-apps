import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-list.ts";

/**
 * Google marks `filter` required on this endpoint and will not list every
 * property you can reach — only those under a named parent.
 */
Deno.test("property-list: builds the required parent filter from the account id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: [] } }], { display: {} });
  await action.execute!({ accountId: "accounts/456" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1beta/properties");
  assertEquals(url.searchParams.get("filter"), "parent:accounts/456");
});

Deno.test("property-list: an account id is required and must be numeric", async () => {
  const missing = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, missing.ctx), Error, "`accountId`");
  const bad = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ accountId: "acme" }, bad.ctx),
    Error,
    "numeric account id",
  );
  assertEquals(missing.calls.length + bad.calls.length, 0);
});
