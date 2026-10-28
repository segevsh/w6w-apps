import { assertEquals } from "@std/assert";
import issueCreate from "../../actions/issue-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("issue-create: POST /api/v3/portal/1/projects/2/issues", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "60" } }]);
  const res = await issueCreate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "name": "Crash",
      "assigneeZpuid": "7",
      "flag": "Internal",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/issues");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Crash",
    "flag": "Internal",
    "assignee": { "zpuid": "7" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "60" });
});
