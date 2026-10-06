import { assertEquals } from "@std/assert";
import projectUserList from "../../actions/project-user-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-user-list: GET /api/v3/portal/1/projects/2/users", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "page_info": { "page": 1, "per_page": 100, "has_next_page": false },
      "users": [{ "zpuid": "7" }],
    },
  }]);
  const res = await projectUserList.execute(
    { "portalId": "1", "projectId": "2" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/users");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "zpuid": "7" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
