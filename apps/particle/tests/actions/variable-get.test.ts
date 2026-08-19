import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-get.ts";

const ID = "0123456789abcdef01234567";
const device = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    connected: true,
    last_heard: "2026-08-19T10:00:00Z",
    variables: { temperature: "double" },
    ...attributes,
  },
});
const value = {
  status: 200,
  body: {
    name: "temperature",
    result: 21.5,
    coreInfo: { connected: true, last_heard: "2026-08-19T10:00:01Z" },
  },
};

Deno.test("variable-get: checks the device first, then reads the value", async () => {
  const { ctx, calls } = mockCtx([device(), value]);
  const result = await action.execute(
    { deviceId: ID, variable: "temperature" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, `https://api.particle.io/v1/devices/${ID}/temperature`);
  assertEquals(result.value, 21.5);
  assertEquals(result.connected, true);
});

/** A timeout from an unreachable device says nothing useful on its own. */
Deno.test("variable-get: an offline device is explained rather than left to time out", async () => {
  const { ctx, calls } = mockCtx([device({ connected: false })]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, variable: "temperature" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/is not connected/.test(message), message);
  assert(/round trip to the hardware/.test(message), message);
  assert(/subscribe to the events it publishes/.test(message), message);
  assertEquals(calls.length, 1, "the read was not attempted");
});

/** A name that is not declared is a 404 that looks like a missing device. */
Deno.test("variable-get: an undeclared variable names what the firmware does declare", async () => {
  const { ctx, calls } = mockCtx([device()]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, variable: "humidity" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/declares no variable "humidity"/.test(message), message);
  assert(/it declares temperature/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("variable-get: the check can be skipped, and then there is one call", async () => {
  const { ctx, calls } = mockCtx([value]);
  await action.execute({ deviceId: ID, variable: "temperature", checkFirst: false }, ctx);
  assertEquals(calls.length, 1);
});

/** Sensor readings are the caller's data. */
Deno.test("variable-get: logs the name, never the value", async () => {
  const { ctx, logs } = mockCtx([device(), {
    status: 200,
    body: { name: "temperature", result: "sensitive-reading", coreInfo: {} },
  }]);
  await action.execute({ deviceId: ID, variable: "temperature" }, ctx);
  assertEquals(JSON.stringify(logs).includes("sensitive-reading"), false);
  assertEquals(logs[0].data, { name: "temperature" });
});

Deno.test("variable-get: a variable name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ deviceId: ID }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`variable` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
