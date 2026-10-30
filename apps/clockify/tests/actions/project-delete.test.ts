import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

test("project-delete: DELETEs and reports deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspaceId: "ws1", projectId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/projects/p1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
