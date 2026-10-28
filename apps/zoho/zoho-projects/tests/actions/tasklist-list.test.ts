import { assertEquals } from "@std/assert";
import tasklistList from "../../actions/tasklist-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("tasklist-list: GET /api/v3/portal/1/projects/2/tasklists", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "page_info": { "page": 1, "per_page": 10, "has_next_page": false },
      "tasklists": [{ "id": "30" }],
    },
  }]);
  const res = await tasklistList.execute(
    { "portalId": "1", "projectId": "2", "perPage": 10 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasklists");
  assertEquals(Object.fromEntries(url.searchParams), { "per_page": "10" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "30" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
