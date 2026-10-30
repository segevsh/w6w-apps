import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-search.ts";

test("ticket-search: prepends type:ticket so results are always tickets", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { results: [], count: 0 } }]);
  await action.execute({ query: "status:open" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/search.json");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "type:ticket status:open");
});
