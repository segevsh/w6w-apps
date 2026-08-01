import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /workspaces/{id}/projects with page/page-size", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "p1" }] }]);
  const result = await action.execute({ workspaceId: "ws1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/projects");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page-size"), "50");
  assertEquals(result, { items: [{ id: "p1" }] });
});
