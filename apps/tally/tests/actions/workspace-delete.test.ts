import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-delete.ts";

test("workspace-delete: DELETEs the workspace and handles the empty 204", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspaceId: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1");
  assertEquals(result, { workspaceId: "w1", deleted: true });
  assertEquals(logs[0].level, "info");
});

test("workspace-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
