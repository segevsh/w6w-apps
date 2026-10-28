import { assertEquals } from "@std/assert";
import issueList from "../../actions/issue-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("issue-list: GET /api/v3/portal/1/projects/2/issues", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "page_info": { "page": 1, "per_page": 100, "has_next_page": false },
      "issues": [{ "id": "60" }],
    },
  }]);
  const res = await issueList.execute(
    { "portalId": "1", "projectId": "2", "sortBy": "due_date" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/issues");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "1",
    "per_page": "100",
    "sort_by": "due_date",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "60" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
