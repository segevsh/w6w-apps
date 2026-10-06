import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("task-delete: DELETE /api/v3/portal/1/projects/2/tasks/40", async () => {
  const { ctx, calls } = mockProjectsCtx([{ status: 204 }]);
  const res = await taskDelete.execute(
    { "portalId": "1", "projectId": "2", "taskId": "40" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasks/40");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.deleted, true);
});
