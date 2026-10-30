import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import aggregation from "../../actions/competitor-aggregation.ts";
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

test("competitor-aggregation: GET /v2/analytics/competitors/{id}/aggregation", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(900) }]);
  assertEquals(await aggregation.execute(M, ctx), { value: 900 });
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/competitors/77/aggregation");
});
