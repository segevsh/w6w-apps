import { assert, assertEquals } from "@std/assert";
import check from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => check.check!({} as never, ctx);

Deno.test("quota: informational, with no egress allowlist of its own", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  // `scope: "connection"` and `credential: "signed"` are this kind's defaults.
  assertEquals(check.network, undefined);
});

Deno.test("quota: headers in either spelling are read into buckets", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { models: [] },
    headers: {
      "ratelimit-limit-requests": "1000",
      "ratelimit-remaining-requests": "500",
      "ratelimit-reset-requests": "60",
      "x-ratelimit-limit-tokens": "40000",
      "x-ratelimit-remaining-tokens": "100",
    },
  }]);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://ollama.com/api/tags");
  assertEquals(result.state, "degraded");
  const buckets = (result as { quota?: Array<{ id: string; remaining: number; limit?: number }> })
    .quota ?? [];
  assertEquals(buckets.map((b) => b.id), ["requests", "tokens"]);
  assertEquals(buckets[0].remaining, 500);
  assertEquals(buckets[0].limit, 1000);
  assertEquals(buckets[1].limit, 40000);
});

Deno.test("quota: an exhausted window is down even though the check is informational", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "ratelimit-remaining-requests": "0", "ratelimit-limit-requests": "1000" },
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("quota: no headers is unknown, never invented; a failed probe is unknown too", async () => {
  const bare = await run(mockCtx([{ status: 200, body: { models: [] } }]).ctx);
  assertEquals(bare.state, "unknown");
  assert(/ratelimit/.test(bare.message!), bare.message);

  const failed = await run(mockCtx([{ status: 401, body: "no" }]).ctx);
  assertEquals(failed.state, "unknown");
});
