import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /workspaces/{id}/projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  const result = await action.execute({ workspaceId: "ws1", projectId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/projects/p1");
  assertEquals(result, { id: "p1" });
});
