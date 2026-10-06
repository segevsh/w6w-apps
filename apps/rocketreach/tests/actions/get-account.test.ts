import { assertEquals, assertRejects } from "@std/assert";
import getAccount from "../../actions/get-account.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-account: maps the account and its credit usage", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 9,
      first_name: "Mark",
      last_name: "Cuban",
      email: "m@x.co",
      state: "registered",
      credit_usage: [{ credit_type: "lookup", allocated: 100, used: 4, remaining: 96 }],
      rate_limits: [{ action: "search", duration: "minute", limit: 15, used: 1, remaining: 14 }],
    },
  }]);
  const out = await run(getAccount, {}, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/account/");
  assertEquals(calls[0].method, "GET");
  assertEquals([out.id, out.firstName, out.email], [9, "Mark", "m@x.co"]);
  assertEquals(out.creditUsage[0].remaining, 96);
  assertEquals(out.rateLimits.length, 1);
});

Deno.test("get-account: a bare body is tolerated; a 401 throws the vendor detail", async () => {
  const bare = mockCtx([{ body: {} }]);
  assertEquals((await run(getAccount, {}, bare.ctx)).creditUsage, []);
  const bad = mockCtx([{ status: 401, body: { detail: "Invalid API key" } }]);
  await assertRejects(() => run(getAccount, {}, bad.ctx), Error, "Invalid API key");
});
