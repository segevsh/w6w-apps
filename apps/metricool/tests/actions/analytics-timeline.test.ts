import { assertEquals } from "@std/assert";
import timeline from "../../actions/analytics-timeline.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const M = {
  blogId: "9",
  network: "instagram",
  metric: "followers",
  from: "2026-01-01T00:00:00+01:00",
  to: "2026-01-31T23:59:59+01:00",
  subject: "account",
};
const WIRE = {
  blogId: "9",
  network: "instagram",
  metric: "followers",
  from: M.from,
  to: M.to,
  subject: "account",
};

Deno.test("analytics-timeline: GET /v2/analytics/timelines", async () => {
  const series = [{ metric: "followers", values: [{ dateTime: "2026-01-01", value: 3 }] }];
  const { ctx, calls } = mockCtx([{ body: envelope(series) }]);
  const out = await timeline.execute(M, ctx);
  assertEquals(out, { items: series, count: 1 });
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/timelines");
  assertEquals(queryOf(calls[0].url), WIRE);
});
