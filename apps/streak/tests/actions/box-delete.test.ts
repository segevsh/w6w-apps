import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import boxDelete from "../../actions/box-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("box-delete: DELETEs the box", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await boxDelete.execute({ boxKey: "b1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1");
  assertEquals(out, { success: true });
});
