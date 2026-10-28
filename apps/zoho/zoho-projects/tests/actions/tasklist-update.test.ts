import { assertEquals } from "@std/assert";
import tasklistUpdate from "../../actions/tasklist-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("tasklist-update: PATCH /api/v3/portal/1/projects/2/tasklists/30", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "30" } }]);
  const res = await tasklistUpdate.execute(
    { "portalId": "1", "projectId": "2", "tasklistId": "30", "status": "completed" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasklists/30");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "status": "completed" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "30" });
});
