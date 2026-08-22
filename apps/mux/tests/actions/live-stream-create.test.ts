import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/live-stream-create.ts";

const ok = {
  status: 201,
  body: { data: { id: "ls1", stream_key: "super-secret-key", status: "idle" } },
};

Deno.test("live-stream-create: sends the latency and reconnect settings", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute!({ latencyMode: "low", reconnectWindow: 120 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/live-streams");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.latency_mode, "low");
  assertEquals(sent.reconnect_window, 120);
  // Recording on by default, so each broadcast becomes an asset.
  assert(sent.new_asset_settings, JSON.stringify(sent));
});

Deno.test("live-stream-create: recording can be turned off", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute!({ record: false }, ctx);
  assertEquals("new_asset_settings" in JSON.parse(calls[0].body!), false);
});

/** The stream key is a credential — anyone holding it can broadcast. */
Deno.test("live-stream-create: never logs the stream key", async () => {
  const { ctx, logs } = mockCtx([ok]);
  await action.execute!({}, ctx);
  const logged = JSON.stringify(logs);
  assert(!logged.includes("super-secret-key"), logged);
  assert(logged.includes("ls1"), logged);
});
