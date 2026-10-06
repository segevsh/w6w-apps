import { assertEquals } from "@std/assert";
import summary from "../../actions/brand-summary-posts-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const M = {
  blogId: "9",
  network: "instagram",
  metric: "followers",
  from: "2026-01-01T00:00:00+01:00",
  to: "2026-01-31T23:59:59+01:00",
  subject: "account",
};
Deno.test("brand-summary-posts-list: GET /v2/analytics/brand-summary/posts", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "a", network: "facebook" }]) }]);
  const out = await summary.execute({ blogId: "9", from: M.from, to: M.to, timezone: "UTC" }, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/brand-summary/posts");
  assertEquals(queryOf(calls[0].url).timezone, "UTC");
});
