import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-activity-list.ts";

Deno.test("lead-activity-list: pages with curPage and nothing else", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ type: "Search", text: "Search", created: 1747272300000 }],
  }]);
  const result = await action.execute!({ leadId: 1, curPage: 2 }, ctx) as Array<{
    created: number;
  }>;

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/leads/1/activities");
  assertEquals(url.searchParams.get("curPage"), "2");
  // Page size is fixed at 100; offset/limit are not accepted here.
  assertEquals(url.searchParams.has("limit"), false);
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(result[0].created, 1747272300000);
});

Deno.test("lead-activity-list: the hint says the page size is fixed", () => {
  const curPage = action.params!.find((p) => p.key === "curPage")!;
  assert(/fixed at 100/.test(curPage.hint!), curPage.hint);
});
