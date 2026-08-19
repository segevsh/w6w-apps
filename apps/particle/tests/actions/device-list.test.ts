import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-list.ts";

const devices = [
  {
    id: "0123456789abcdef01234567",
    name: "gateway",
    connected: true,
    last_heard: "2026-08-19T10:00:00Z",
    system_firmware_version: "5.9.0",
  },
  {
    id: "0123456789abcdef01234568",
    name: "sensor-a",
    connected: false,
    last_heard: "2026-08-19T09:00:00Z",
    system_firmware_version: "5.9.0",
  },
  {
    id: "0123456789abcdef01234569",
    name: "sensor-b",
    connected: false,
    last_heard: "2026-06-01T00:00:00Z",
    system_firmware_version: "4.2.0",
  },
];

Deno.test("device-list: reads the account's devices as a bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: devices }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.particle.io/v1/devices");
  assertEquals(result.count, 3);
  assertEquals((result.ids as string[])[0], "0123456789abcdef01234567");
});

/** A product's devices come back wrapped, and from a different path. */
Deno.test("device-list: a product fleet is a different path and a wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { devices } }]);
  const result = await action.execute({ product: "my-product" }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/products/my-product/devices");
  assertEquals(url.searchParams.get("per_page"), "100");
  assertEquals(result.count, 3);
});

/** A sleeping sensor is offline and fine; the action reports, not judges. */
Deno.test("device-list: counts online and offline without calling either unhealthy", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: devices }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.onlineCount, 1);
  assertEquals(result.offlineCount, 2);
  assertEquals(logs[0].level, "info", "not a warning — offline is often correct");
  assert(/NOT a health metric/.test(action.description!), action.description);
});

/** The comparison the API does not make. */
Deno.test("device-list: names the device heard from longest ago", async () => {
  const { ctx } = mockCtx([{ status: 200, body: devices }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.quietest as Record<string, unknown>).name, "sensor-b");
});

/** The function argument limit alone varies with Device OS. */
Deno.test("device-list: reports the distinct Device OS versions in the fleet", async () => {
  const { ctx } = mockCtx([{ status: 200, body: devices }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.firmwareVersions, ["4.2.0", "5.9.0"]);
});

Deno.test("device-list: filters by name locally", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: devices }]);
  const result = await action.execute({ name: "SENSOR" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(new URL(calls[0].url).searchParams.get("name"), null);
});

Deno.test("device-list: an account with no devices is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.quietest, undefined);
});
