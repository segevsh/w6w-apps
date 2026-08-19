import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-get.ts";

const UUID = "a".repeat(32);
const device = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    d: [{
      id: 5,
      uuid: UUID,
      device_name: "winter-sunset",
      status: "idle",
      overall_status: "idle",
      is_online: true,
      api_heartbeat_state: "online",
      os_version: "balenaOS 2.108.18",
      supervisor_version: "14.11.10",
      is_running__release: { __id: 900 },
      should_be_running__release: { __id: 900 },
      is_pinned_on__release: null,
      ...extra,
    }],
  },
});

Deno.test("device-get: fetches by uuid and compares running against target", async () => {
  const { ctx, calls } = mockCtx([device()]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("$filter"), `uuid eq '${UUID}'`);
  assertEquals(result.onTargetRelease, true);
  assertEquals(result.isPinned, false);
  assertEquals(result.statusMeaning, "online and running what it should be");
});

Deno.test("device-get: a device running something else is off target", async () => {
  const { ctx } = mockCtx([device({ is_running__release: { __id: 800 } })]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.onTargetRelease, false);
});

/** An offline device keeps returning its last reading, with nothing marking it. */
Deno.test("device-get: reports how stale the metrics are, and says so when very", async () => {
  const fresh = mockCtx([device()]);
  const online = await action.execute({ uuid: UUID }, fresh.ctx) as Record<string, unknown>;
  assertEquals(online.metricsAgeSeconds, 0);

  const stale = mockCtx([device({
    is_online: false,
    api_heartbeat_state: "offline",
    last_connectivity_event: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  })]);
  const offline = await action.execute({ uuid: UUID }, stale.ctx) as Record<string, unknown>;
  assert(Number(offline.metricsAgeSeconds) > 600_000, String(offline.metricsAgeSeconds));
  assert(
    stale.logs.some((l) => /stale/.test(l.message)),
    JSON.stringify(stale.logs),
  );
});

/** A hardware problem wearing a software costume. */
Deno.test("device-get: warns about undervoltage in the terms it presents as", async () => {
  const { ctx, logs } = mockCtx([device({ is_undervolted: true })]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.isUndervolted, true);
  assert(
    logs.some((l) => l.level === "warn" && /random crashes/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-get: an unmatched uuid names the short-uuid trap", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: [] } }]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID }, ctx),
    Error,
  );
  assert(/first 7 characters/.test(err.message), err.message);
});

Deno.test("device-get: a short uuid is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({ uuid: "a1b2c3d" }, ctx), Error, "SHORT");
  assertEquals(calls.length, 0);
});

Deno.test("device-get: a pinned device says so", async () => {
  const { ctx } = mockCtx([device({ is_pinned_on__release: { __id: 800 } })]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.isPinned, true);
});
