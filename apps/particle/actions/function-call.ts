import type { ActionDefinition } from "@w6w/types";
import { byteLength, deviceId, MAX_FUNCTION_ARG_BYTES, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/devices/{id}/{function}` — make the device do something.
 *
 * ## This actuates hardware, and there is no dry run
 *
 * A Particle function is whatever the firmware author wired it to. In the field
 * that is a relay, a lock, a valve, a motor, a reboot. The cloud has no idea
 * which — `unlock` and `blink` are the same shape of call — so nothing here can
 * distinguish a harmless one from a consequential one, and this action does not
 * pretend to. What it does is refuse to guess: the function name has to match
 * one the firmware actually declares.
 *
 * ## The return value is a single integer, and that is the whole channel
 *
 * `Particle.function` handlers have the signature `int (String)`. There is no
 * way to return data: the convention is a status code, with `-1` commonly
 * meaning failure. A function that needs to report something publishes an event
 * or sets a variable instead.
 *
 * So a `return_value` of 0 usually means success and sometimes means the
 * firmware author chose otherwise, and this reports the integer without
 * interpreting it.
 *
 * ## The argument limit varies by device, not by API
 *
 * Particle's documentation: "a maximum size of 64 to 1024 bytes of UTF-8
 * characters … the limit varies depending on Device OS version and sometimes
 * the device". So the identical call can succeed on one device and fail on
 * another in the same fleet. This enforces the 1024 ceiling and warns well
 * before it, because the effective limit may be a sixteenth of that.
 */
const action: ActionDefinition = {
  key: "function-call",
  type: "perform",
  resource: "function",
  title: "Call a device function",
  description:
    "Call a function on the device's firmware — which in the field actuates real hardware, and " +
    "the cloud cannot tell a relay from a blink. Returns a single INTEGER, because that is the " +
    "entire return channel a Particle function has.",
  idempotent: false,
  params: [
    DEVICE_PARAM,
    {
      key: "function",
      label: "Function",
      type: "string",
      required: true,
      default: "",
      hint: "As declared by the firmware currently running — `device-get` lists them.",
    },
    {
      key: "argument",
      label: "Argument",
      type: "string",
      default: "",
      hint: "One string. The limit is 64 to 1024 BYTES depending on Device OS and the device, so " +
        "the same call can work on one device and fail on another.",
    },
    {
      key: "checkFirst",
      label: "Check the device and the function first",
      type: "boolean",
      default: true,
      hint: "Costs one extra call. Off, a wrong function name is a 404 that looks like a missing " +
        "device.",
    },
  ],
  output: [
    { key: "returnValue", type: "number", label: "The integer the firmware returned" },
    { key: "called", type: "boolean", label: "Whether the device ran it" },
    { key: "function", type: "string", label: "What was called" },
    { key: "connected", type: "boolean", label: "Whether the device was connected" },
    { key: "argumentBytes", type: "number", label: "How large the argument was" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);
    const name = String(p.function ?? "").trim();
    if (!name) throw new Error("`function` is required");

    const argument = String(p.argument ?? "");
    const argumentBytes = byteLength(argument);
    if (argumentBytes > MAX_FUNCTION_ARG_BYTES) {
      throw new Error(
        `the argument is ${argumentBytes} bytes and Particle's ceiling is ` +
          `${MAX_FUNCTION_ARG_BYTES}. The EFFECTIVE limit is lower and varies — Particle ` +
          "documents 64 to 1024 bytes depending on Device OS version and sometimes the device — " +
          "so a shorter argument, or an event carrying the payload, is the reliable shape",
      );
    }

    const client = new ParticleClient(ctx);

    if (p.checkFirst !== false) {
      const device = await client.request<{
        connected?: boolean;
        last_heard?: string;
        functions?: string[];
      }>(`/v1/devices/${id}`);

      if (device?.connected !== true) {
        throw new Error(
          `this device is not connected (last heard ${device?.last_heard ?? "never"}), so the ` +
            "call cannot reach it. A function call is a round trip to the hardware, not a " +
            "message queued for later — nothing will run it when the device wakes",
        );
      }
      const declared = device?.functions ?? [];
      if (declared.length && !declared.includes(name)) {
        throw new Error(
          `the firmware running on this device declares no function "${name}" — it declares ` +
            `${declared.join(", ")}. That list changes when the device is reflashed`,
        );
      }
    }

    const result = await client.request<{
      return_value?: number;
      connected?: boolean;
      id?: string;
    }>(`/v1/devices/${id}/${encodeURIComponent(name)}`, {
      method: "POST",
      form: { arg: argument },
    });

    // The function and the result. Never the argument — it is a command, and
    // commands carry codes, positions and identifiers.
    ctx.log("info", "called a Particle device function", {
      function: name,
      returnValue: result?.return_value,
    });

    return {
      // A single integer is the whole return channel; -1 is the usual failure.
      returnValue: result?.return_value,
      called: true,
      function: name,
      connected: result?.connected === true,
      argumentBytes,
    };
  },
};

export default action;
