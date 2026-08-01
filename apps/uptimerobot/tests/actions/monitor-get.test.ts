import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/monitor-get.ts";

Deno.test("monitor-get: POSTs /getMonitors with monitors=<id> and unwraps the single result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      stat: "ok",
      monitors: [{ id: 777749809, friendly_name: "Google", url: "http://www.google.com" }],
    },
  }]);
  const out = await action.execute({ monitorId: "777749809" }, ctx) as { id: number };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/getMonitors");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("monitors"), "777749809");
  assertEquals(out.id, 777749809);
});

Deno.test("monitor-get: throws when UptimeRobot returns no matching monitor", async () => {
  const { ctx } = mockCtx([{ body: { stat: "ok", monitors: [] } }]);
  await assertRejects(async () => await action.execute({ monitorId: "999" }, ctx), Error, "999");
});
