import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/saved-search-get-many.ts";

Deno.test("saved-search-get-many: GETs /services/saved/searches", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }]);
  await action.execute({ count: 30, offset: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/services/saved/searches");
  assertEquals(url.searchParams.get("count"), "30");
});
