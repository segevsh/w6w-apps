import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-list.ts";

const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
const later = new Date(Date.now() + 300 * 86_400_000).toISOString();

const devices = [
  {
    nodeId: "n1",
    hostname: "web-01",
    connectedToControl: true,
    authorized: true,
    expires: later,
    tags: ["tag:prod"],
  },
  {
    nodeId: "n2",
    hostname: "laptop",
    connectedToControl: false,
    lastSeen: "2026-08-01T00:00:00Z",
    authorized: true,
    expires: soon,
    updateAvailable: true,
  },
  {
    nodeId: "n3",
    hostname: "new-box",
    connectedToControl: true,
    authorized: false,
    keyExpiryDisabled: true,
    multipleConnections: true,
  },
  { nodeId: "n4", hostname: "partner-laptop", isExternal: true, connectedToControl: true },
];

/** No pagination, so the filtering has to happen at Tailscale. */
Deno.test("device-list: filters server-side, repeating tags to mean all of them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { devices } }]);
  await action.execute({ tags: "tag:prod, tag:web", hostname: "web-01" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("tags"), ["tag:prod", "tag:web"]);
  assertEquals(q.get("hostname"), "web-01");
  assertEquals(q.get("fields"), "default");
});

Deno.test("device-list: ephemeral and all-fields toggles reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { devices: [] } }]);
  await action.execute({ ephemeralOnly: true, allFields: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("isEphemeral"), "true");
  assertEquals(q.get("fields"), "all");
});

/** A shared-in device is somebody else's machine. */
Deno.test("device-list: excludes external devices by default and counts them", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assertEquals(result.externalCount, 1);
  assertEquals(result.nodeIds, ["n1", "n2", "n3"]);

  const withExternal = mockCtx([{ status: 200, body: { devices } }]);
  const all = await action.execute({ includeExternal: true }, withExternal.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(all.count, 4);
});

/** `lastSeen` is omitted exactly when the device is connected. */
Deno.test("device-list: offline is computed from connectedToControl, not from lastSeen", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const offline = result.offline as Array<{ nodeId: string; lastSeen?: string }>;
  assertEquals(offline.map((device) => device.nodeId), ["n2"]);
  assertEquals(offline[0].lastSeen, "2026-08-01T00:00:00Z");
});

Deno.test("device-list: separates unauthorized, outdated and expiring devices", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unauthorized, ["new-box"]);
  assertEquals(result.updateAvailable, ["laptop"]);
  assertEquals((result.keyExpiringSoon as unknown[]).length, 1);
  assertEquals(result.keyExpiryDisabled, 1);
});

/** A key that never expires cannot be expiring soon. */
Deno.test("device-list: a device with expiry disabled is never counted as expiring", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { devices: [{ nodeId: "n9", expires: soon, keyExpiryDisabled: true }] },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.keyExpiringSoon, []);
});

/** Usually a copied Tailscale state directory. */
Deno.test("device-list: surfaces one node key live on several machines", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.multipleConnections, ["new-box"]);
});

Deno.test("device-list: says Tailscale has no pagination", () => {
  assert(/NO PAGINATION/.test(action.description!), action.description);
  assertEquals(action.type, "search");
});
