import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-bin.ts";

test("delete-bin: DELETEs /api/bin/:binId", async () => {
  const { ctx, calls } = mockCtx([{ body: { msg: "Bin Deleted" } }]);
  const out = await action.execute({ binId: "YS4il4gS" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin/YS4il4gS");
  assertEquals(out.msg, "Bin Deleted");
});

test("delete-bin: declares idempotent (PostBin returns 200 even for an already-gone bin)", () => {
  assertEquals(action.idempotent, true);
});
