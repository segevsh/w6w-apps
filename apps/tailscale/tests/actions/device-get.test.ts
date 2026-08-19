import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-get.ts";

const device = {
  nodeId: "n1",
  id: "92960230385",
  hostname: "web-01",
  addresses: ["100.87.74.78"],
  tags: ["tag:prod"],
  connectedToControl: true,
  authorized: true,
  expires: new Date(Date.now() + 100 * 86_400_000).toISOString(),
};

Deno.test("device-get: fetches the device and asks for every field by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: device }]);
  const result = await action.execute({ deviceId: "n1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/device/n1");
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "all");
  assertEquals(result.nodeId, "n1");
  assertEquals(result.online, true);
  assertEquals(result.tags, ["tag:prod"]);
});

/** An expired key takes a device offline while leaving it listed. */
Deno.test("device-get: counts the days a key has left and warns when it has none", async () => {
  const ok = mockCtx([{ status: 200, body: device }]);
  const healthy = await action.execute({ deviceId: "n1" }, ok.ctx) as Record<string, unknown>;
  assertEquals(healthy.keyExpiresInDays, 100);
  assertEquals(ok.logs.filter((l) => l.level === "warn").length, 0);

  const expired = mockCtx([{
    status: 200,
    body: { ...device, expires: new Date(Date.now() - 86_400_000).toISOString() },
  }]);
  const result = await action.execute({ deviceId: "n1" }, expired.ctx) as Record<string, unknown>;
  assertEquals(result.keyExpiresInDays, -1);
  assert(
    expired.logs.some((l) => l.level === "warn" && /EXPIRED/.test(l.message)),
    JSON.stringify(expired.logs),
  );
});

Deno.test("device-get: a key expiring within a fortnight is noted, not warned", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { ...device, expires: new Date(Date.now() + 3 * 86_400_000).toISOString() },
  }]);
  await action.execute({ deviceId: "n1" }, ctx);
  assert(
    logs.some((l) => l.level === "info" && /expires soon/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Expiry disabled means the clock never runs out. */
Deno.test("device-get: says nothing about expiry when expiry is disabled", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      ...device,
      keyExpiryDisabled: true,
      expires: new Date(Date.now() - 1000).toISOString(),
    },
  }]);
  const result = await action.execute({ deviceId: "n1" }, ctx) as Record<string, unknown>;
  assertEquals(result.keyExpiryDisabled, true);
  assertEquals(logs.length, 0);
});

Deno.test("device-get: requires an id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`deviceId` is required");
  assertEquals(calls.length, 0);
});

Deno.test("device-get: says the nodeId is the preferred identifier", () => {
  const param = action.params!.find((p) => p.key === "deviceId")!;
  assert(/`nodeId`.*is preferred/.test(param.hint!), param.hint);
});
