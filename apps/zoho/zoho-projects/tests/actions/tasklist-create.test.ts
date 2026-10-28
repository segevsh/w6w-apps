import { assertEquals } from "@std/assert";
import tasklistCreate from "../../actions/tasklist-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("tasklist-create: POST /api/v3/portal/1/projects/2/tasklists", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "30" } }]);
  const res = await tasklistCreate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "name": "Backlog",
      "milestoneId": "4",
      "flag": "internal",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/tasklists");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Backlog",
    "milestone": { "id": "4" },
    "flag": "internal",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "30" });
});
