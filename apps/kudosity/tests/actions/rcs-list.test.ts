import { assertEquals } from "@std/assert";
import rcsList from "../../actions/rcs-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rcs-list: cursor paging params and no campaign filter", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ messages: [{ id: "1" }, { id: "2" }] }, { pagination: { has_next: false } }),
  }]);
  const out = await rcsList.execute({ dateRange: "last_week", limit: 5, cursor: "c" }, ctx) as {
    messages: unknown[];
    pagination: unknown;
  };
  assertEquals(pathOf(calls[0].url), "/v2/rcs/messages");
  const q = queryOf(calls[0].url);
  assertEquals(q.get("date_range"), "last_week");
  assertEquals(q.get("cursor"), "c");
  assertEquals(q.has("campaign_id"), false);
  assertEquals(out.messages.length, 2);
  assertEquals(out.pagination, { has_next: false });
});
