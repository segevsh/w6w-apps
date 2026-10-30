import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import nodeDelete from "../../actions/node-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const OK = { status: "ok" };
test("node-delete: DELETEs /nodes/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  assertEquals(await nodeDelete.execute({ id: "abc" }, ctx), OK);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/abc");
});
