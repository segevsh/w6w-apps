import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-discounts.ts";

Deno.test("search-discounts: passes scope and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { discounts: [] } }]);
  const result = await action.execute!({
    organizationId: "o1",
    scope: "event",
    eventId: "e1",
    codeFilter: "SAVE",
    orderBy: "code_asc",
    pageSize: 10,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/organizations/o1/discounts/");
  assertEquals(url.searchParams.get("scope"), "event");
  assertEquals(url.searchParams.get("event_id"), "e1");
  assertEquals(url.searchParams.get("code_filter"), "SAVE");
  assertEquals(url.searchParams.get("order_by"), "code_asc");
  assertEquals(url.searchParams.get("page_size"), "10");
  assertEquals(result, { discounts: [] });
});
