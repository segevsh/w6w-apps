import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import windowClose from "../../actions/window-close.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("window-close: DELETEs the window and reports the vendor's success flag", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ success: true }) }]);
  const out = await windowClose.execute({ sessionId: "s1", windowId: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1");
  assertEquals(out, { success: true });
});

test("window-close: is declared idempotent", () => {
  assertEquals(windowClose.idempotent, true);
});
