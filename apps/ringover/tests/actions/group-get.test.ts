import { assertEquals } from "@std/assert";
import action from "../../actions/group-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("group-get: GETs /groups/{id} with member paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { group_id: 6, name: "Sales", users: [] } }]);
  const out = await action.execute!({ groupId: 6, limitCount: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/groups/6");
  assertEquals(Object.fromEntries(url.searchParams), { limit_count: "20" });
  assertEquals(out, { group_id: 6, name: "Sales", users: [] });
});
