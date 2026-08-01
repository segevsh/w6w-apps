import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/monitor-list.ts";

Deno.test("monitor-list: POSTs /getMonitors with dash-joined statuses/types", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitors: [{ id: 1 }, { id: 2 }] } }]);
  const out = await action.execute({
    search: "example",
    statuses: [2, 9],
    types: [1, 4],
    limit: 25,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/getMonitors");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("search"), "example");
  assertEquals(body.get("statuses"), "2-9");
  assertEquals(body.get("types"), "1-4");
  assertEquals(body.get("limit"), "25");
  assertEquals(out.monitors.length, 2);
});

Deno.test("monitor-list: omits unfilled optional fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitors: [] } }]);
  await action.execute({}, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.has("search"), false);
  assertEquals(body.has("statuses"), false);
  assertEquals(body.has("types"), false);
});
