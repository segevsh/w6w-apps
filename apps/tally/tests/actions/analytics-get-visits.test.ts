import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/analytics-get-visits.ts";

Deno.test("analytics-get-visits: GETs the visits series", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { "2026-08-01": { totalVisits: 12 } }, interval: 86400 } },
  ]);
  const result = await action.execute({ formId: "f1", period: "30d" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/f1/analytics/visits");
  assertEquals(url.searchParams.get("period"), "30d");
  assertEquals(result.data, { "2026-08-01": { totalVisits: 12 } });
  assertEquals(result.interval, 86400);
});

Deno.test("analytics-get-visits: defaults data to an empty map", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await action.execute({ formId: "f1", period: "all" }, ctx)).data, {});
});
