import { assertEquals } from "@std/assert";
import aggregation from "../../actions/analytics-aggregation.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const M = {
  blogId: "9",
  network: "instagram",
  metric: "followers",
  from: "2026-01-01T00:00:00+01:00",
  to: "2026-01-31T23:59:59+01:00",
  subject: "account",
};
Deno.test("analytics-aggregation: GET /v2/analytics/aggregation returns the number", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(12.5) }, { body: envelope(null) }]);
  assertEquals(await aggregation.execute(M, ctx), { value: 12.5 });
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/aggregation");
  assertEquals(await aggregation.execute(M, ctx), { value: null });
});
