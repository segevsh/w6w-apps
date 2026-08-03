import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-delete.ts";

Deno.test("workspace-delete: DELETEs the workspace and handles the empty 204", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspaceId: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1");
  assertEquals(result, { workspaceId: "w1", deleted: true });
  assertEquals(logs[0].level, "info");
});

Deno.test("workspace-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
