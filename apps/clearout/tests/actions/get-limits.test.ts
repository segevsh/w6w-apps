import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-limits.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-limits: returns the limit objects with the vendor's string figures untouched", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        email_verify: {
          api_rate_limit: {
            total: "100",
            remaining: "42",
            next_limit_reset: "2026-10-06T00:00:00Z",
          },
          bulk_verify_concurrency_limit: { total: "5", remaining: "4" },
        },
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/account/limits");
  assertEquals((out.apiRateLimit as Record<string, string>).remaining, "42");
  assertEquals(out.bulkVerifyConcurrencyLimit, { total: "5", remaining: "4" });
});

Deno.test("get-limits: absent sections are null; 401 throws", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", data: {} } }]);
  assertEquals(await run(action, {}, ctx), {
    apiRateLimit: null,
    bulkVerifyConcurrencyLimit: null,
  });
  const bad = mockCtx([{
    status: 401,
    body: { status: "failed", error: { code: 1000, message: "x" } },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "401");
});
