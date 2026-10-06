import { assertEquals } from "@std/assert";
import action from "../../actions/group-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("group-list: GETs /groups with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_count: 1, list: [{ group_id: 2 }] } }]);
  const out = await action.execute!({ limitCount: 5, limitOffset: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/groups");
  assertEquals(Object.fromEntries(url.searchParams), { limit_count: "5", limit_offset: "10" });
  assertEquals(out, { groups: [{ group_id: 2 }], count: 1 });
});
