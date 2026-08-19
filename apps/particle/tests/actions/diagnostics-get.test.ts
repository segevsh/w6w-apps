import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/diagnostics-get.ts";

const ID = "0123456789abcdef01234567";
const vitals = (overrides: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    diagnostics: {
      updated_at: "2026-08-19T09:55:00Z",
      payload: {
        device: {
          network: { signal: { strength: 72, quality: 60 } },
          power: { battery: { charge: 88, state: "discharging" } },
          system: { memory: { used: 40000, total: 160000 }, uptime: 86400 },
          ...overrides,
        },
      },
    },
  },
});

Deno.test("diagnostics-get: reads the last reported vitals", async () => {
  const { ctx, calls } = mockCtx([vitals()]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `https://api.particle.io/v1/diagnostics/${ID}/last`);
  assertEquals(result.signalStrength, 72);
  assertEquals(result.batteryCharge, 88);
  assertEquals(result.batteryState, "discharging");
  assertEquals(result.uptimeSeconds, 86400);
});

/** A firmware leak shows as free memory falling between reports. */
Deno.test("diagnostics-get: computes free memory from used and total", async () => {
  const { ctx } = mockCtx([vitals()]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.freeMemory, 120000);
});

/** A device at the edge of coverage reconnects constantly. */
Deno.test("diagnostics-get: a weak signal is warned about", async () => {
  const { ctx, logs } = mockCtx([vitals({ network: { signal: { strength: 12, quality: 8 } } })]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.signalStrength, 12);
  assertEquals(logs[0].level, "warn");
  assert(/edge of coverage reconnects constantly/.test(logs[0].message), logs[0].message);

  const strong = mockCtx([vitals()]);
  await action.execute({ deviceId: ID }, strong.ctx);
  assertEquals(strong.logs.length, 0);
});

/** These are the LAST reported values, so the timestamp is the key field. */
Deno.test("diagnostics-get: returns when the device last reported", async () => {
  const { ctx } = mockCtx([vitals()]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.updatedAt, "2026-08-19T09:55:00Z");
  assert(/LAST reported values/.test(action.description!), action.description);
});

Deno.test("diagnostics-get: a sparse payload does not throw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { diagnostics: { updated_at: "x" } } }]);
  const result = await action.execute({ deviceId: ID }, ctx) as Record<string, unknown>;
  assertEquals(result.signalStrength, undefined);
  assertEquals(result.freeMemory, undefined);
  assertEquals(result.updatedAt, "x");
});
