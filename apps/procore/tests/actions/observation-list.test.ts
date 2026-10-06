import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/observation-list.ts";

Deno.test("observation-list: GETs /rest/v1.0/observations/items and returns a page with the Link marker", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1 }],
    headers: {
      "content-type": "application/json",
      link: '<https://api.procore.com/rest/v1.0/x?page=2>; rel="next"',
    },
  }]);
  const out = await action.execute!({
    "companyId": 5,
    "projectId": 8,
    "status": "1",
    "search": "fall",
  }, ctx) as {
    items: unknown[];
    nextPage?: number;
    hasMore: boolean;
  };
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/rest/v1.0/observations/items");
  assertEquals(url.searchParams.get("project_id"), "8");
  assertEquals(url.searchParams.get("filters[status]"), "1");
  assertEquals(url.searchParams.get("filters[search]"), "fall");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.nextPage, 2);
  assertEquals(out.hasMore, true);
});

Deno.test("observation-list: omits unset filters and reports the last page", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await action.execute!({ "companyId": 5, "projectId": 8 }, ctx) as {
    hasMore: boolean;
  };
  assertEquals(new URL(calls[0].url).searchParams.has("page"), false);
  assertEquals(out.hasMore, false);
});
