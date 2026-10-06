import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /rest/v1.0/projects and returns a page with the Link marker", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1 }],
    headers: {
      "content-type": "application/json",
      link: '<https://api.procore.com/rest/v1.0/x?page=2>; rel="next"',
    },
  }]);
  const out = await action.execute!(
    { "companyId": 5, "page": 2, "perPage": 10, "compact": true },
    ctx,
  ) as {
    items: unknown[];
    nextPage?: number;
    hasMore: boolean;
  };
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/rest/v1.0/projects");
  assertEquals(url.searchParams.get("company_id"), "5");
  assertEquals(url.searchParams.get("serializer_view"), "compact");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.nextPage, 2);
  assertEquals(out.hasMore, true);
});

Deno.test("project-list: omits unset filters and reports the last page", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await action.execute!({ "companyId": 5 }, ctx) as { hasMore: boolean };
  assertEquals(new URL(calls[0].url).searchParams.has("page"), false);
  assertEquals(out.hasMore, false);
});
