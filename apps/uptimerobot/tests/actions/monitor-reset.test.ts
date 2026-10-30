import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/monitor-reset.ts";

test("monitor-reset: POSTs /resetMonitor and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 777712827 } } }]);
  const out = await action.execute({ monitorId: "777712827" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/resetMonitor");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("id"), "777712827");
  assertEquals(out, { id: 777712827 });
});
