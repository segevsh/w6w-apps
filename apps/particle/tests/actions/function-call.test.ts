import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/function-call.ts";

const ID = "0123456789abcdef01234567";
const device = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    connected: true,
    last_heard: "2026-08-19T10:00:00Z",
    functions: ["led", "reset"],
    ...attributes,
  },
});
const called = (returnValue: number) => ({
  status: 200,
  body: { id: ID, return_value: returnValue, connected: true },
});

Deno.test("function-call: checks the device, then posts the argument as a form field", async () => {
  const { ctx, calls } = mockCtx([device(), called(1)]);
  const result = await action.execute(
    { deviceId: ID, function: "led", argument: "on" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, `https://api.particle.io/v1/devices/${ID}/led`);
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].body, "arg=on");
  assertEquals(result.returnValue, 1);
  assertEquals(result.argumentBytes, 2);
});

/** A single integer is the whole return channel. */
Deno.test("function-call: reports the integer without interpreting it", async () => {
  for (const value of [0, 1, -1, 42]) {
    const { ctx } = mockCtx([device(), called(value)]);
    const result = await action.execute(
      { deviceId: ID, function: "led" },
      ctx,
    ) as Record<string, unknown>;
    assertEquals(result.returnValue, value);
  }
  assert(/entire return channel/.test(action.description!), action.description);
});

/** A function call is a round trip, not a message queued for later. */
Deno.test("function-call: an offline device is refused, saying nothing will run it later", async () => {
  const { ctx, calls } = mockCtx([device({ connected: false })]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, function: "led" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not connected/.test(message), message);
  assert(/nothing will run it when the device wakes/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("function-call: an undeclared function names what the firmware does declare", async () => {
  const { ctx, calls } = mockCtx([device()]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, function: "unlock" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/declares no function "unlock"/.test(message), message);
  assert(/it declares led, reset/.test(message), message);
  assertEquals(calls.length, 1);
});

/** Particle documents 64 to 1024 bytes depending on Device OS and device. */
Deno.test("function-call: the argument ceiling is enforced in bytes, and says it varies", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, function: "led", argument: "x".repeat(1025) }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/1025 bytes and Particle's ceiling is 1024/.test(message), message);
  assert(/64 to 1024 bytes depending on Device OS/.test(message), message);
  assertEquals(calls.length, 0, "checked before anything was called");
});

Deno.test("function-call: the ceiling counts bytes, not characters", async () => {
  // 513 two-byte characters is 1026 bytes.
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ deviceId: ID, function: "led", argument: "é".repeat(513) }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/1026 bytes/.test(message), message);
});

/** A command carries codes, positions and identifiers. */
Deno.test("function-call: logs the function and the result, never the argument", async () => {
  const { ctx, logs } = mockCtx([device(), called(0)]);
  await action.execute(
    { deviceId: ID, function: "led", argument: "secret-position-42" },
    ctx,
  );
  assertEquals(JSON.stringify(logs).includes("secret-position-42"), false);
  assertEquals(logs[0].data, { function: "led", returnValue: 0 });
});

Deno.test("function-call: is not idempotent, because it actuates hardware", () => {
  assertEquals(action.idempotent, false);
  assert(/actuates real hardware/.test(action.description!), action.description);
});
