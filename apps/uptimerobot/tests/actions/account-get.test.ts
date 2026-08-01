import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: POSTs /getAccountDetails and maps snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      stat: "ok",
      account: {
        email: "user@example.com",
        monitor_limit: 50,
        monitor_interval: 1,
        up_monitors: 3,
        down_monitors: 1,
        paused_monitors: 2,
      },
    },
  }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/getAccountDetails");
  assertEquals(calls[0].method, "POST");
  // No api_key here — that's the auth sign hook's job, not the action's.
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.has("api_key"), false);
  assertEquals(out, {
    email: "user@example.com",
    monitorLimit: 50,
    monitorInterval: 1,
    upMonitors: 3,
    downMonitors: 1,
    pausedMonitors: 2,
  });
});
