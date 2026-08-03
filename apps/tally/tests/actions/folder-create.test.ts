import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-create.ts";

Deno.test("folder-create: POSTs the folder to the workspace", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1", name: "Intake" } }]);
  const result = await action.execute({ workspaceId: "w1", name: "Intake" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1/folders");
  assertEquals(jsonBody(calls[0]), { name: "Intake" });
  assertEquals(result.id, "f1");
});

Deno.test("folder-create: nests under a parent when one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ workspaceId: "w1", name: "Sub", parentId: "f1" }, ctx);
  assertEquals(jsonBody(calls[0]), { name: "Sub", parentId: "f1" });
});

Deno.test("folder-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
