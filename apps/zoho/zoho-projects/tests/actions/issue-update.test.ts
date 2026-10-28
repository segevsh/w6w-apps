import { assertEquals } from "@std/assert";
import issueUpdate from "../../actions/issue-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("issue-update: PATCH /api/v3/portal/1/projects/2/issues/60", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "60" } }]);
  const res = await issueUpdate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "issueId": "60",
      "statusId": "9",
      "dueDate": "2026-12-31T00:00:00+05:30",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/issues/60");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "status": { "id": "9" },
    "due_date": "2026-12-31T00:00:00+05:30",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "60" });
});
