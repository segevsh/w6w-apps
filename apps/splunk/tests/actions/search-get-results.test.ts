import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-get-results.ts";

test("search-get-results: GETs /results with count/offset", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { results: [], fields: [] } }]);
  await action.execute({ sid: "123", count: 50, offset: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/services/search/jobs/123/results");
  assertEquals(url.searchParams.get("count"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});
