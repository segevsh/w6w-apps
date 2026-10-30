import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import milestoneDelete from "../../actions/milestone-delete.ts";
import { mockProjectsCtx } from "../_helpers.ts";

test("milestone-delete: DELETE /api/v3.1/portal/1/projects/2/phases/50", async () => {
  const { ctx, calls } = mockProjectsCtx([{ status: 204 }]);
  const res = await milestoneDelete.execute(
    { "portalId": "1", "projectId": "2", "milestoneId": "50" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3.1/portal/1/projects/2/phases/50");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.deleted, true);
});
