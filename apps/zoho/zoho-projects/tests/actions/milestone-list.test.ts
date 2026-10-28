import { assertEquals } from "@std/assert";
import milestoneList from "../../actions/milestone-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("milestone-list: GET /api/v3.1/portal/1/projects/2/phases", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "phases": [{ "id": "50" }],
      "page_info": { "page": 1, "per_page": 100, "has_next_page": false },
    },
  }]);
  const res = await milestoneList.execute(
    { "portalId": "1", "projectId": "2" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3.1/portal/1/projects/2/phases");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "50" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
