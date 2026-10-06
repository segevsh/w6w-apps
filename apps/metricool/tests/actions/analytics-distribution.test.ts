import { assertEquals } from "@std/assert";
import distribution from "../../actions/analytics-distribution.ts";
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

Deno.test("analytics-distribution: GET /v2/analytics/distribution", async () => {
  const rows = [{ key: "ES", value: 4 }];
  const { ctx, calls } = mockCtx([{ body: envelope(rows) }]);
  assertEquals(await distribution.execute(M, ctx), { items: rows, count: 1 });
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/distribution");
  assertEquals(queryOf(calls[0].url), WIRE);
});
