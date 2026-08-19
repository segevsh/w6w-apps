import type { ActionDefinition } from "@w6w/types";
import { TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/device/{deviceId}` — one machine, in full.
 *
 * ## Two ids, and only one of them is stable
 *
 * A device has a numeric `id` (legacy) and a `nodeId` beginning with `n`.
 * Tailscale's spec says the `nodeId` is preferred and the endpoint accepts
 * either, so a workflow can be storing either — but the numeric form is the
 * one Tailscale is moving away from, and this action says which it was given.
 *
 * ## A device that left the tailnet is a 404, not a tombstone
 *
 * There is no deleted state to read: removal is removal. A workflow keyed on a
 * `nodeId` from last week can therefore fail with "not found" for a machine
 * that was retired normally, which is not the same as a machine that never
 * existed and is worth distinguishing in the message.
 *
 * ## Key expiry is the thing that silently takes a machine offline
 *
 * Device keys expire — by default every 180 days — and an expired device stops
 * being reachable while remaining listed. `keyExpiryDisabled` turns that off,
 * which is standard for servers and a real decision for laptops: a stolen one
 * keeps working forever.
 */
const action: ActionDefinition = {
  key: "device-get",
  type: "read",
  resource: "device",
  title: "Get a device",
  description:
    "One machine in full. Reports how long its key has left — an expired key takes a device " +
    "OFFLINE while leaving it listed — and whether expiry has been disabled, which is normal " +
    "for a server and a decision for a laptop.",
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
      hint: "The `nodeId` (starts with `n`) is preferred. The legacy numeric id also works.",
    },
    {
      key: "allFields",
      label: "Return every field",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Adds client connectivity detail and posture identity.",
    },
  ],
  output: [
    { key: "device", type: "object", label: "The device" },
    { key: "nodeId", type: "string", label: "The stable id" },
    { key: "hostname", type: "string", label: "Machine name" },
    { key: "addresses", type: "array", label: "Its Tailscale IPs" },
    { key: "tags", type: "array", label: "The tags that own it, if any" },
    { key: "user", type: "string", label: "Who registered it — empty once tagged" },
    { key: "online", type: "boolean", label: "Connected to the control plane right now" },
    { key: "authorized", type: "boolean", label: "Allowed to participate in the tailnet" },
    { key: "keyExpiresInDays", type: "number", label: "Days until the key expires" },
    { key: "keyExpiryDisabled", type: "boolean", label: "Its key never expires" },
    { key: "updateAvailable", type: "boolean", label: "A newer client exists" },
    { key: "isExternal", type: "boolean", label: "Shared in from another tailnet" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");

    const device = await new TailscaleClient(ctx).request<{
      nodeId?: string;
      id?: string;
      hostname?: string;
      addresses?: string[];
      tags?: string[];
      user?: string;
      connectedToControl?: boolean;
      authorized?: boolean;
      expires?: string;
      keyExpiryDisabled?: boolean;
      updateAvailable?: boolean;
      isExternal?: boolean;
    }>(`/device/${encodeURIComponent(deviceId)}`, {
      query: { fields: p.allFields === false ? "default" : "all" },
    });

    const expires = device?.expires ? Date.parse(device.expires) : NaN;
    const keyExpiresInDays = Number.isFinite(expires)
      ? Math.round((expires - Date.now()) / 86_400_000)
      : undefined;

    if (device?.keyExpiryDisabled !== true && typeof keyExpiresInDays === "number") {
      if (keyExpiresInDays <= 0) {
        ctx.log(
          "warn",
          "this device's key has EXPIRED — it is still listed and cannot be " +
            "reached until somebody re-authenticates it",
          { deviceId },
        );
      } else if (keyExpiresInDays <= 14) {
        ctx.log(
          "info",
          "this device's key expires soon, after which it goes offline while " +
            "remaining listed",
          { deviceId, keyExpiresInDays },
        );
      }
    }

    return {
      device,
      nodeId: device?.nodeId,
      hostname: device?.hostname,
      addresses: device?.addresses ?? [],
      // Once a device is tagged, the tag owns it and `user` stops meaning much.
      tags: device?.tags ?? [],
      user: device?.user,
      online: device?.connectedToControl === true,
      authorized: device?.authorized !== false,
      keyExpiresInDays,
      keyExpiryDisabled: device?.keyExpiryDisabled === true,
      updateAvailable: device?.updateAvailable === true,
      isExternal: device?.isExternal === true,
    };
  },
};

export default action;
