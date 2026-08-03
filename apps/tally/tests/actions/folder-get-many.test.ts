import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-get-many.ts";

Deno.test("folder-get-many: GETs the workspace's folders as a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "f1" }, { id: "f2", parentId: "f1" }] }]);
  const result = await action.execute({ workspaceId: "w1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1/folders");
  assertEquals(result.count, 2);
  assertEquals(result.items, [{ id: "f1" }, { id: "f2", parentId: "f1" }]);
});

Deno.test("folder-get-many: tolerates a non-array body", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({ workspaceId: "w1" }, ctx);
  assertEquals(result, { items: [], count: 0 });
});
