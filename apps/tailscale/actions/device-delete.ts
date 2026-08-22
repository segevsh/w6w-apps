import type { ActionDefinition } from "@w6w/types";
import { TailscaleClient } from "../lib/client.ts";

/**
 * `DELETE /api/v2/device/{deviceId}` — remove a machine from the tailnet.
 *
 * ## Gone, not archived
 *
 * There is no deleted state in this API. The device disappears: it stops
 * appearing in `device-list`, `device-get` answers 404, and its Tailscale IP
 * goes back into the pool. A workflow holding that `nodeId` gets a not-found
 * that reads exactly like a typo.
 *
 * ## What it does not do
 *
 * It does not touch the machine. Tailscale keeps running there and will try to
 * reconnect; on a device that still has a valid auth key — an ephemeral CI
 * runner, say — it may simply rejoin as a *new* device with a new id. Removing
 * a machine for good means removing the key that lets it back in, which is
 * `key-delete`.
 *
 * ## The gentler options
 *
 * De-authorizing keeps the registration and cuts off traffic; expiring the key
 * forces a fresh login. Both are reversible. This is not, so it asks.
 */
const action: ActionDefinition = {
  key: "device-delete",
  type: "perform",
  resource: "device",
  title: "Delete a device",
  description:
    "Remove a machine from the tailnet — GONE, not archived, with its address returned to the " +
    "pool. It does not stop Tailscale on the machine, so a device holding a valid auth key can " +
    "rejoin as a new one.",
  idempotent: false,
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "There is no undelete and no deleted state to read afterwards.",
    },
  ],
  output: [
    { key: "deviceId", type: "string", label: "Which device" },
    { key: "hostname", type: "string", label: "What it was called" },
    { key: "addresses", type: "array", label: "Its addresses, now back in the pool" },
    { key: "tags", type: "array", label: "The tags it carried" },
    { key: "deleted", type: "boolean", label: "Whether it was removed" },
    {
      key: "wasEphemeral",
      type: "boolean",
      label: "An ephemeral device would have gone by itself",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to delete this device. There is no undelete, no deleted state to read " +
          "afterwards, and a machine that still holds a valid auth key can simply rejoin as a " +
          "new device — `device-authorize` with `authorized: false` cuts it off reversibly",
      );
    }

    const client = new TailscaleClient(ctx);
    // Read first: after the delete there is nothing left to report.
    const before = await client.request<{
      hostname?: string;
      addresses?: string[];
      tags?: string[];
      isEphemeral?: boolean;
    }>(`/device/${encodeURIComponent(deviceId)}`);

    await client.request(`/device/${encodeURIComponent(deviceId)}`, { method: "DELETE" });

    ctx.log(
      "warn",
      "deleted a device — Tailscale is still running on the machine and will try " +
        "to reconnect; removing the auth key it used is what keeps it out",
      { deviceId },
    );

    return {
      deviceId,
      hostname: before?.hostname,
      addresses: before?.addresses ?? [],
      tags: before?.tags ?? [],
      deleted: true,
      wasEphemeral: before?.isEphemeral === true,
    };
  },
};

export default action;
