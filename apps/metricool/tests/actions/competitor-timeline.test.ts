import { assertEquals } from "@std/assert";
import timeline from "../../actions/competitor-timeline.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const M = {
  blogId: "9",
  competitorId: "77",
  network: "instagram",
  metric: "followers",
  from: "2026-01-01T00:00:00+01:00",
  to: "2026-01-31T23:59:59+01:00",
  subject: "competitors",
};

Deno.test("competitor-timeline: GET /v2/analytics/competitors/{id}/timelines", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ metric: "followers", values: [] }]) }]);
  const out = await timeline.execute(M, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/competitors/77/timelines");
  assertEquals(new URL(calls[0].url).searchParams.get("network"), "instagram");
});
