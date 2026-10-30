import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-workspace.ts";

test("delete-workspace: DELETEs /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 200);
});

test("delete-workspace: treated as idempotent — deleting twice converges on gone", () => {
  assertEquals(action.idempotent, true);
});
