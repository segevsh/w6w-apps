import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("task-list: GET /api/v3/portal/1/projects/2/tasks", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "page_info": { "page": 3, "per_page": 100, "has_next_page": true },
      "tasks": [{ "id": "40" }],
    },
  }]);
  const res = await taskList.execute(
    { "portalId": "1", "projectId": "2", "page": 3, "viewId": "9" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasks");
  assertEquals(Object.fromEntries(url.searchParams), { "page": "3", "view_id": "9" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "40" }]);
  assertEquals(res.hasNext, true);
  assertEquals(res.page, 3);
});
