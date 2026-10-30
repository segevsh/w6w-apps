import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-data-sources.ts";

test("Search Data Sources discovers current parent IDs with a data_source filter", async () => {
  const response = {
    results: [{ id: "source", parent: { database_id: "container" } }],
    next_cursor: "next",
    has_more: true,
  };
  const { ctx, calls } = mockCtx([{ body: response }]);
  assertEquals(
    await action.execute({ query: "Tasks", startCursor: "cursor", pageSize: 25 }, ctx),
    response,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    query: "Tasks",
    start_cursor: "cursor",
    page_size: 25,
    filter: { property: "object", value: "data_source" },
  });
});
