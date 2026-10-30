import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-get-many.ts";

test("search-get-many: GETs /services/search/jobs with pagination", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }]);
  await action.execute({ count: 30, offset: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/services/search/jobs");
  assertEquals(url.searchParams.get("count"), "30");
});
