import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-get: GET /api/v3/portal/1/projects/10", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "10", "name": "Site" } }]);
  const res = await projectGet.execute(
    { "portalId": "1", "projectId": "10" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/10");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "10", "name": "Site" });
});
