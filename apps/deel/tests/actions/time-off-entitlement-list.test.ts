import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-entitlement-list.ts";

Deno.test("time-off-entitlement-list: reads a profile's leave balances", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display: {} });
  await action.execute!({ hrisProfileId: "hp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/time_offs/profile/hp1/entitlements");
});

Deno.test("time-off-entitlement-list: a blank profile fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`hrisProfileId`");
  assertEquals(calls.length, 0);
});
