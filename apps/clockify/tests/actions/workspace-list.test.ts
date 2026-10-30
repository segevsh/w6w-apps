import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list.ts";

test("workspace-list: GETs /workspaces", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "ws1" }] }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces");
  assertEquals(result, { items: [{ id: "ws1" }] });
});
