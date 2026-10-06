import { assertEquals } from "@std/assert";
import action from "../../actions/list-finder-lists.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-finder-lists: the status filter is `processed` and there is no type filter", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ list_id: "f1" }], page_info: { has_more: false, last_cursor: "C" } },
  }]);
  const out = await run(action, {
    status: "processed",
    type: "ignored",
    dateRange: "ps_this_month",
  }, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_finder/list");
  assertEquals(JSON.parse(calls[0].body!), {
    start_after: null,
    filter: { date_range: "ps_this_month", processed: "processed" },
  });
  assertEquals(out, { lists: [{ list_id: "f1" }], hasMore: false, nextCursor: "C" });
  assertEquals(action.params!.some((p) => p.key === "type"), false);
});
