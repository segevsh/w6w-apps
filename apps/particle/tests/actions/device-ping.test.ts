import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-ping.ts";

const ID = "0123456789abcdef01234567";
const record = (connected: boolean) => ({ status: 200, body: { connected } });
const pong = (online: boolean) => ({ status: 200, body: { online, ok: true } });

Deno.test("device-ping: reads the cached flag, then forces a round trip", async () => {
  const { ctx, calls } = mockCtx([record(true), pong(true)]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(calls[1].url, `https://api.particle.io/v1/devices/${ID}/ping`);
  assertEquals(calls[1].method, "PUT");
  assertEquals(result.online, true);
  assertEquals(result.cachedConnected, true);
  assertEquals(result.stale, false);
});

/** The flag stays true until the lost connection times out. */
Deno.test("device-ping: a record that disagrees with reality is flagged as stale", async () => {
  const { ctx, logs } = mockCtx([record(true), pong(false)]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.online, false);
  assertEquals(result.stale, true);
  assertEquals(logs[0].level, "warn");
  assert(/stays true until the lost connection times out/.test(logs[0].message), logs[0].message);
});

Deno.test("device-ping: the other direction is reported too", async () => {
  const { ctx, logs } = mockCtx([record(false), pong(true)]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.stale, true);
  assert(
    /answered a ping while its record said it was disconnected/.test(logs[0].message),
    logs[0].message,
  );
});

Deno.test("device-ping: agreement does not warn", async () => {
  const { ctx, logs } = mockCtx([record(false), pong(false)]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.stale, false);
  assertEquals(logs.length, 0);
});

/** Every ping is data over the device's own connection. */
Deno.test("device-ping: says what it costs on a metered SIM", () => {
  assert(/Costs the device a little data/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
