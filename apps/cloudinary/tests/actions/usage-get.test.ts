import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-get.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

/** The hourly allowance is only visible in the headers. */
Deno.test("usage-get: merges the rate-limit headers into the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { plan: "Free", credits: { usage: 3.5, limit: 25 } },
    headers: {
      "content-type": "application/json",
      "x-featureratelimit-limit": "500",
      "x-featureratelimit-remaining": "420",
      "x-featureratelimit-reset": "Tue, 18 Aug 2026 17:00:00 GMT",
    },
  }], conn);
  const out = await action.execute!({}, ctx) as {
    plan: string;
    rate_limit: { limit: number; remaining: number; reset: string };
  };
  assertEquals(out.plan, "Free");
  assertEquals(out.rate_limit.limit, 500);
  assertEquals(out.rate_limit.remaining, 420);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/usage");
});

Deno.test("usage-get: a past date goes on the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ date: "1-8-2026" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("date"), "1-8-2026");
});
