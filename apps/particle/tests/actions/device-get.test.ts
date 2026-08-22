import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-get.ts";

const ID = "0123456789abcdef01234567";

const device = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    id: ID,
    name: "gateway",
    connected: true,
    last_heard: "2026-08-19T10:00:00Z",
    variables: { temperature: "double", status: "string" },
    functions: ["led", "reset"],
    system_firmware_version: "5.9.0",
    cellular: true,
    ...attributes,
  },
});

Deno.test("device-get: reads one device", async () => {
  const { ctx, calls } = mockCtx([device()]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `https://api.particle.io/v1/devices/${ID}`);
  assertEquals(result.name, "gateway");
  assertEquals(result.connected, true);
  assertEquals(result.cellular, true);
});

/** The only place the firmware's contract is written down. */
Deno.test("device-get: returns the variables with their types, and the functions", async () => {
  const { ctx } = mockCtx([device()]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.variables, { temperature: "double", status: "string" });
  assertEquals(result.functions, ["led", "reset"]);
  assert(/changes whenever the device is reflashed/.test(action.description!), action.description);
});

/** Offline is normal for a battery-powered device. */
Deno.test("device-get: an offline device is noted at info, not warned about", async () => {
  const { ctx, logs } = mockCtx([device({ connected: false })]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.connected, false);
  assertEquals(logs[0].level, "info");
  assert(/normal rather than a fault/.test(logs[0].message), logs[0].message);

  const online = mockCtx([device()]);
  await action.execute({ deviceId: ID }, online.ctx);
  assertEquals(online.logs.length, 0);
});

Deno.test("device-get: a device with no declared variables is not an error", async () => {
  const { ctx } = mockCtx([device({ variables: undefined, functions: undefined })]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.variables, {});
  assertEquals(result.functions, []);
});

Deno.test("device-get: a name instead of an id is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ deviceId: "gateway" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/24-character hexadecimal/.test(message), message);
  assertEquals(calls.length, 0);
});
