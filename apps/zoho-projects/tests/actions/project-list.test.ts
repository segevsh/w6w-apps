import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-list: GET /api/v3/portal/1/projects", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: [{ "id": "10", "name": "Site" }] }]);
  const res = await projectList.execute(
    { "portalId": "1", "sortBy": "ASC(name)" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects");
  assertEquals(Object.fromEntries(url.searchParams), { "sort_by": "ASC(name)" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "10", "name": "Site" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
