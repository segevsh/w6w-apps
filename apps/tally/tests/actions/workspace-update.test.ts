import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-update.ts";

test("workspace-update: PATCHes the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", name: "Renamed" } }]);
  const result = await action.execute({ workspaceId: "w1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1");
  assertEquals(jsonBody(calls[0]), { name: "Renamed" });
  assertEquals(result.name, "Renamed");
});

test("workspace-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
