import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/monitor-update.ts";

Deno.test("monitor-update: POSTs /editMonitor with only id + supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 777712827 } } }]);
  const out = await action.execute({ monitorId: "777712827", status: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/editMonitor");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("id"), "777712827");
  assertEquals(body.get("status"), "0");
  // Nothing else was supplied, so nothing else should be sent.
  assertEquals(body.has("friendly_name"), false);
  assertEquals(body.has("url"), false);
  assertEquals(out, { id: 777712827 });
});

Deno.test("monitor-update: can update just the friendly name", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 1 } } }]);
  await action.execute({ monitorId: "1", friendlyName: "Renamed" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("friendly_name"), "Renamed");
  assertEquals(body.has("status"), false);
});
