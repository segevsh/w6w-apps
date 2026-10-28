import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("task-update: PATCH /api/v3/portal/1/projects/2/tasks/40", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "40" } }]);
  const res = await taskUpdate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "taskId": "40",
      "statusId": "6",
      "completionPercentage": 100,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasks/40");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "status": { "id": "6" },
    "completion_percentage": 100,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "40" });
});
