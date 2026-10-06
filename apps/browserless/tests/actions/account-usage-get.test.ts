import { assertEquals, assertRejects } from "@std/assert";
import usage from "../../actions/account-usage-get.ts";
import { mockCtx, region } from "../_helpers.ts";

Deno.test("account-usage-get: calls api.browserless.io whatever the region", async () => {
  const { ctx, calls } = mockCtx([{ body: { units: 1 } }], { connection: region("ams") });
  const out = await usage.execute({}, ctx);
  assertEquals(out, { usage: { units: 1 } });
  assertEquals(calls[0].url, "https://api.browserless.io/v1/account/usage");
  assertEquals(calls[0].method, "GET");
});

Deno.test("account-usage-get: the account host's JSON error is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid API token" } }]);
  await assertRejects(async () => await usage.execute({}, ctx), Error, "Invalid API token");
});
