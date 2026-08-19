import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-list.ts";

const devices = [
  {
    uuid: "a".repeat(32),
    device_name: "winter-sunset",
    status: "idle",
    is_online: true,
    api_heartbeat_state: "online",
  },
  {
    uuid: "b".repeat(32),
    device_name: "holy-frost",
    status: "idle",
    is_online: true,
    api_heartbeat_state: "timeout",
  },
  {
    uuid: "c".repeat(32),
    device_name: "quiet-dust",
    status: "disconnected",
    is_online: false,
    api_heartbeat_state: "offline",
    last_connectivity_event: "2026-08-01T00:00:00Z",
  },
  {
    uuid: "d".repeat(32),
    device_name: "new-box",
    status: "configuring",
    is_online: true,
    api_heartbeat_state: "online",
    provisioning_progress: 40,
  },
  {
    uuid: "e".repeat(32),
    device_name: "hot-shore",
    status: "updating",
    is_online: true,
    api_heartbeat_state: "online",
    is_undervolted: true,
  },
];

/** balena omits overall_status unless it is named in $select. */
Deno.test("device-list: asks for overall_status explicitly", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: devices } }]);
  await action.execute({}, ctx);
  const select = new URL(calls[0].url).searchParams.get("$select")!;
  assert(select.includes("overall_status"), select);
  assert(select.includes("api_heartbeat_state"), select);
});

/** `timeout` is a device that has gone quiet, not one that is gone. */
Deno.test("device-list: separates a heartbeat timeout from being offline", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.heartbeatTimeout, ["holy-frost"]);
  assertEquals((result.offline as Array<{ name: string }>).map((d) => d.name), ["quiet-dust"]);
  assertEquals(result.onlineCount, 4);
});

/** Provisioning is not a failure. */
Deno.test("device-list: reports configuring devices with their progress", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.configuring, [{ name: "new-box", progress: 40 }]);
  assertEquals(result.updating, ["hot-shore"]);
});

/** A power problem that presents as random instability. */
Deno.test("device-list: surfaces undervoltage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.undervolted, ["hot-shore"]);
});

Deno.test("device-list: counts every status it saw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.statusCounts, {
    idle: 2,
    disconnected: 1,
    configuring: 1,
    updating: 1,
  });
});

Deno.test("device-list: filters by fleet slug, fleet id, state and name", async () => {
  const bySlug = mockCtx([{ status: 200, body: { d: [] } }]);
  await action.execute(
    { fleet: "acme/sensors", state: "online", nameContains: "winter" },
    bySlug.ctx,
  );
  const filter = new URL(bySlug.calls[0].url).searchParams.get("$filter")!;
  assert(/a\/slug eq 'acme\/sensors'/.test(filter), filter);
  assert(/is_online eq true/.test(filter), filter);
  assert(/contains\(device_name,'winter'\)/.test(filter), filter);

  const byId = mockCtx([{ status: 200, body: { d: [] } }]);
  await action.execute({ fleet: "42", state: "offline" }, byId.ctx);
  const other = new URL(byId.calls[0].url).searchParams.get("$filter")!;
  assert(/belongs_to__application eq 42/.test(other), other);
  assert(/is_online eq false/.test(other), other);
});

Deno.test("device-list: the limit is clamped to what balena will page", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: [] } }]);
  await action.execute({ limit: 99999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$top"), "1000");
});

/** A new balena status should pass through rather than being swallowed. */
Deno.test("device-list: notes statuses it has no description for", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { d: [{ uuid: "f".repeat(32), device_name: "odd", status: "hibernating" }] },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.statusCounts as Record<string, number>).hibernating, 1);
  assert(logs.some((l) => /does not have a description/.test(l.message)), JSON.stringify(logs));
});
