import type { ActionDefinition } from "@w6w/types";
import { csv, query, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/tailnet/{tailnet}/devices` — every machine in the tailnet.
 *
 * ## There is no pagination, so the filters are not a convenience
 *
 * Tailscale returns the whole tailnet in one response — its spec says so in as
 * many words. A tailnet of five thousand devices is a five-thousand-device
 * response, and there is no page size to lower.
 *
 * What there is, is **server-side filtering**: `<field>=<value>` on any
 * top-level device property, matched exactly, ANDed together. Repeating `tags`
 * requires *all* of them. This action uses that rather than fetching
 * everything and filtering in the workflow, because the difference is a
 * megabyte of JSON crossing the wire.
 *
 * ## `lastSeen` is absent exactly when the device is connected
 *
 * Tailscale omits `lastSeen` when `connectedToControl` is true, on the grounds
 * that "now" is not a last-seen time. A workflow sorting by `lastSeen` to find
 * stale machines therefore sorts the online ones to the bottom as undefined,
 * which looks identical to never having connected. This returns both fields
 * and an explicit `offline` list computed from the pair.
 *
 * ## `multipleConnections` is a security signal, not a statistic
 *
 * Set when several devices are live on the *same node key* — which usually
 * means a machine's Tailscale state was copied to another host. It is omitted
 * when the count returns to one, so it is not sticky, and nothing else reports
 * it. It is surfaced separately because it deserves a look.
 *
 * ## An external device is somebody else's machine
 *
 * `isExternal` marks a device shared *into* this tailnet. It shows up in the
 * list and is not a member: it has no client version, no created date, and
 * counting it as part of the fleet inflates every number.
 */
const action: ActionDefinition = {
  key: "device-list",
  type: "search",
  resource: "device",
  title: "List devices",
  description:
    "Every machine in the tailnet. Tailscale has NO PAGINATION — the whole tailnet comes back at " +
    "once — so the filters here are server-side. Separates shared-in external devices from real " +
    "members, and flags devices whose node key is live on more than one machine.",
  params: [
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      placeholder: "tag:prod, tag:subnetrouter",
      hint: "Comma-separated. Filtered server-side, and a device must carry ALL of them.",
    },
    {
      key: "hostname",
      label: "Hostname",
      type: "string",
      default: "",
      hint: "An exact match — Tailscale's filters do not do substrings.",
    },
    {
      key: "ephemeralOnly",
      label: "Ephemeral devices only",
      type: "boolean",
      default: false,
      hint: "Ephemeral devices remove themselves when they go offline; they are what CI runners " +
        "and short-lived containers should be.",
    },
    {
      key: "includeExternal",
      label: "Include devices shared in from other tailnets",
      type: "boolean",
      default: false,
    },
    {
      key: "allFields",
      label: "Return every field",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Adds connectivity detail and posture data. Larger responses, and there is no " +
        "pagination to soften them.",
    },
  ],
  output: [
    { key: "devices", type: "array", label: "The devices" },
    { key: "count", type: "number", label: "How many" },
    { key: "nodeIds", type: "array", label: "The stable ids other actions take" },
    { key: "offline", type: "array", label: "Not currently connected to the control plane" },
    { key: "unauthorized", type: "array", label: "Waiting for approval, and unable to talk" },
    { key: "updateAvailable", type: "array", label: "Running an old client" },
    { key: "keyExpiringSoon", type: "array", label: "Key expires within 14 days" },
    { key: "keyExpiryDisabled", type: "number", label: "Devices whose keys never expire" },
    { key: "multipleConnections", type: "array", label: "One node key, several live machines" },
    { key: "externalCount", type: "number", label: "Shared in — not members of this tailnet" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);

    // Server-side, because the alternative is the whole tailnet over the wire.
    const filters: Record<string, unknown> = {
      fields: p.allFields === true ? "all" : "default",
      hostname: String(p.hostname ?? "").trim(),
    };
    if (p.ephemeralOnly === true) filters.isEphemeral = true;

    const search = query(filters);
    const url = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) url.append(k, String(v));
    // Repeating `tags` demands all of them, which is the useful reading.
    for (const tag of csv(p.tags) ?? []) url.append("tags", tag);

    const body = await new TailscaleClient(ctx).request<{
      devices?: Array<{
        nodeId?: string;
        id?: string;
        hostname?: string;
        name?: string;
        user?: string;
        os?: string;
        clientVersion?: string;
        updateAvailable?: boolean;
        tags?: string[];
        addresses?: string[];
        authorized?: boolean;
        isExternal?: boolean;
        isEphemeral?: boolean;
        connectedToControl?: boolean;
        lastSeen?: string;
        expires?: string;
        keyExpiryDisabled?: boolean;
        multipleConnections?: boolean;
      }>;
    }>(`/tailnet/${encodeURIComponent(tailnet)}/devices?${url.toString()}`);

    const all = body?.devices ?? [];
    const devices = p.includeExternal === true
      ? all
      : all.filter((device) => device?.isExternal !== true);

    const label = (device: { hostname?: string; nodeId?: string }) =>
      device?.hostname ?? device?.nodeId ?? "(unnamed)";

    // `lastSeen` is omitted precisely when the device is connected, so the
    // pair has to be read together.
    const offline = devices.filter((device) => device?.connectedToControl !== true);

    const soon = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const keyExpiringSoon = devices.filter((device) => {
      if (device?.keyExpiryDisabled === true || !device?.expires) return false;
      const at = Date.parse(device.expires);
      return Number.isFinite(at) && at < soon;
    });

    return {
      devices,
      count: devices.length,
      nodeIds: devices.map((device) => device?.nodeId).filter(Boolean),
      offline: offline.map((device) => ({
        nodeId: device?.nodeId,
        hostname: device?.hostname,
        lastSeen: device?.lastSeen,
      })),
      unauthorized: devices.filter((device) => device?.authorized === false).map(label),
      updateAvailable: devices.filter((device) => device?.updateAvailable === true).map(label),
      keyExpiringSoon: keyExpiringSoon.map((device) => ({
        nodeId: device?.nodeId,
        hostname: device?.hostname,
        expires: device?.expires,
      })),
      keyExpiryDisabled: devices.filter((device) => device?.keyExpiryDisabled === true).length,
      // Usually a copied Tailscale state directory.
      multipleConnections: devices
        .filter((device) => device?.multipleConnections === true)
        .map(label),
      externalCount: all.filter((device) => device?.isExternal === true).length,
    };
  },
};

export default action;
