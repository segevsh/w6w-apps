import { assertEquals, assertRejects } from "@std/assert";
import workspaceUpdate from "../../actions/workspace-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-update: PATCH /workspaces/{id} with the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w 1", name: "New" } }]);
  const out = await workspaceUpdate.execute({ workspaceId: "w 1", name: "New" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/public/v1/workspaces/w%201");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
  assertEquals(out, { id: "w 1", name: "New" });
});

Deno.test("workspace-update: a blank id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await workspaceUpdate.execute({ workspaceId: " ", name: "x" }, ctx)
  );
  assertEquals(calls.length, 0);
});
