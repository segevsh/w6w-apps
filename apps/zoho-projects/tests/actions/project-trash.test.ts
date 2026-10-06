import { assertEquals } from "@std/assert";
import projectTrash from "../../actions/project-trash.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-trash: POST /api/v3/portal/1/projects/10/trash", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: {} }]);
  const res = await projectTrash.execute(
    { "portalId": "1", "projectId": "10" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/10/trash");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, {});
});
