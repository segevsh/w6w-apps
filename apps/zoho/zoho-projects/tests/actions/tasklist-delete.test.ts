import { assertEquals } from "@std/assert";
import tasklistDelete from "../../actions/tasklist-delete.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("tasklist-delete: DELETE /api/v3/portal/1/projects/2/tasklists/30", async () => {
  const { ctx, calls } = mockProjectsCtx([{ status: 204 }]);
  const res = await tasklistDelete.execute(
    { "portalId": "1", "projectId": "2", "tasklistId": "30" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasklists/30");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.deleted, true);
});
