import { assertEquals } from "@std/assert";
import projectRestore from "../../actions/project-restore.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-restore: POST /api/v3/portal/1/projects/10/restore", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: {} }]);
  const res = await projectRestore.execute(
    { "portalId": "1", "projectId": "10" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/10/restore");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, {});
});
