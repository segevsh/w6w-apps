import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

test("project-create: POSTs /workspaces/{id}/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await action.execute({ workspaceId: "ws1", name: "New Project", billable: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/projects");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "New Project", billable: true });
});
