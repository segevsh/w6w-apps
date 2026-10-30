import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-events.ts";

test("get-events: GETs /events/ with default sort=-datetime and forwards filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ filter: 'equals(metric_id,"m-1")' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/events/");
  assertEquals(url.searchParams.get("sort"), "-datetime");
  assertEquals(url.searchParams.get("filter"), 'equals(metric_id,"m-1")');
});
