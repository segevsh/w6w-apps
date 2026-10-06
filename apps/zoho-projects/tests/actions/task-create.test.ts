import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("task-create: POST /api/v3/portal/1/projects/2/tasks", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "40" } }]);
  const res = await taskCreate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "name": "Ship",
      "tasklistId": "30",
      "parentTaskId": "41",
      "ownerZpuids": ["7", "8"],
      "priority": "high",
      "statusId": "5",
      "completionPercentage": 0,
      "billingType": "billable",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasks");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Ship",
    "tasklist": { "id": "30" },
    "parental_info": { "parent_task_id": "41" },
    "status": { "id": "5" },
    "priority": "high",
    "completion_percentage": 0,
    "billing_type": "billable",
    "owners_and_work": { "owners": [{ "zpuid": "7" }, { "zpuid": "8" }] },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "40" });
});
