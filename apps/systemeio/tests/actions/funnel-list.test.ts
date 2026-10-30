import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import funnelList from "../../actions/funnel-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("funnel-list: hits /api/funnels with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Launch" }]) }]);
  await funnelList.execute({ query: "Launch", limit: 20 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/funnels");
  assertEquals(queryOf(calls[0].url), { query: "Launch", limit: "20" });
});
