import { assertEquals } from "@std/assert";
import list from "../../actions/competitor-list.ts";
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

Deno.test("competitor-list: GET /v2/analytics/competitors/{network} with competitors[]", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 77, screenName: "rival" }]) }]);
  const out = await list.execute({
    blogId: "9",
    network: "instagram",
    from: M.from,
    to: M.to,
    timezone: "UTC",
    limit: "10",
    competitors: ["77", 78],
  }, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/competitors/instagram");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("competitors[]"), ["77", "78"]);
  assertEquals(q.get("limit"), "10");
});
