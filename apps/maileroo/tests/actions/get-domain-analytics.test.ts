import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-domain-analytics.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-domain-analytics: maps aggregate, timeline and providers", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        aggregate: { delivered: 500 },
        timeline: [{ date: "2026-06-28", totals: {} }],
        service_providers: [{ name: "Gmail", count: 320 }],
      },
    },
  }]);
  const out = await run(action, { domainId: 123 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/domains/123/analytics");
  assertEquals(out.aggregate, { delivered: 500 });
  assertEquals(out.serviceProviders, [{ name: "Gmail", count: 320 }]);
  assertEquals(out.timeline.length, 1);
});

Deno.test("get-domain-analytics: errors throw", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { message: "no domains.analytics.read" } },
  }]);
  await assertRejects(() => run(action, { domainId: 1 }, ctx), Error, "domains.analytics.read");
});
