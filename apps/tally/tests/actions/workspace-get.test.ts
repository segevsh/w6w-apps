import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get.ts";

Deno.test("workspace-get: GETs one workspace by ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", name: "Ops" } }]);
  const result = await action.execute({ workspaceId: "w1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1");
  assertEquals(result.id, "w1");
  assertEquals(result.name, "Ops");
  assertEquals(result.workspace, { id: "w1", name: "Ops" });
});

Deno.test("workspace-get: percent-encodes the ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ workspaceId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/a%2Fb");
});
