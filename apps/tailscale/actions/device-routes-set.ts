import type { ActionDefinition } from "@w6w/types";
import { csv, EXIT_NODE_ROUTES, isExitNode, TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/device/{deviceId}/routes` — approve what a subnet router may
 * carry.
 *
 * ## Advertised routes cannot be set from here, and that is deliberate
 *
 * Tailscale's spec is explicit: advertised routes "must be set directly on the
 * device". A workflow can approve a route; it cannot make a machine offer one.
 * So approving a route the device does not advertise produces a 200 and no
 * traffic — which is why this action checks first and says so.
 *
 * ## This REPLACES the enabled list
 *
 * "Set a device's enabled subnet routes by replacing the existing list". A
 * naive call that means to add one subnet silently withdraws every other route
 * that device was carrying, and the symptom is a network segment going dark
 * with no error anywhere. `mode: add` reads the current list and merges.
 *
 * ## Approving an exit node is not the same size of decision
 *
 * `0.0.0.0/0` and `::/0` make the machine an exit node: everything anyone in
 * the tailnet sends can leave through it. This warns loudly and demands the
 * `allowExitNode` acknowledgement, because approving one by pattern-matching a
 * CIDR list is exactly how it happens by accident.
 */
const action: ActionDefinition = {
  key: "device-routes-set",
  type: "perform",
  resource: "route",
  title: "Set a device's enabled routes",
  description:
    "Approve what a subnet router may carry. Tailscale REPLACES the enabled list, so `mode: add` " +
    "merges rather than silently withdrawing every other route. Approving `0.0.0.0/0` makes the " +
    "machine an EXIT NODE and needs an explicit acknowledgement.",
  idempotent: true,
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "routes",
      label: "Routes",
      type: "string",
      required: true,
      default: "",
      placeholder: "10.0.0.0/16, 192.168.1.0/24",
      hint: "CIDRs the device already advertises. A route it does not advertise is accepted and " +
        "carries nothing.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "replace",
      options: [
        { value: "replace", label: "Replace — these become the only enabled routes" },
        { value: "add", label: "Add — merge with what is already enabled" },
        { value: "remove", label: "Remove — withdraw these, keep the rest" },
      ],
    },
    {
      key: "allowExitNode",
      label: "Allow approving an exit node",
      type: "boolean",
      default: false,
      hint: "Required to enable `0.0.0.0/0` or `::/0` — that makes this machine a route for all " +
        "of the tailnet's internet traffic, not just a subnet.",
    },
  ],
  output: [
    { key: "deviceId", type: "string", label: "Which device" },
    { key: "enabled", type: "array", label: "The routes now approved" },
    { key: "previousEnabled", type: "array", label: "What was approved before" },
    { key: "withdrawn", type: "array", label: "Approvals this call removed" },
    { key: "notAdvertised", type: "array", label: "Approved, and the device offers no such route" },
    { key: "isExitNode", type: "boolean", label: "Whether it now routes everything" },
    { key: "changed", type: "boolean", label: "Whether anything actually changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");

    const requested = csv(p.routes) ?? [];
    if (!requested.length) {
      throw new Error(
        "`routes` must name at least one CIDR. To withdraw every route, use `mode: remove` with " +
          "the routes currently enabled — an empty replace would silently take a subnet router " +
          "out of service",
      );
    }

    const client = new TailscaleClient(ctx);
    const before = await client.request<{
      advertisedRoutes?: string[];
      enabledRoutes?: string[];
    }>(`/device/${encodeURIComponent(deviceId)}/routes`);
    const previousEnabled = before?.enabledRoutes ?? [];
    const advertised = before?.advertisedRoutes ?? [];

    const mode = String(p.mode ?? "replace");
    let enabled: string[];
    if (mode === "add") {
      enabled = [...new Set([...previousEnabled, ...requested])];
    } else if (mode === "remove") {
      enabled = previousEnabled.filter((route) => !requested.includes(route));
    } else {
      enabled = [...new Set(requested)];
    }

    // Everything the tailnet sends could leave through this machine.
    if (isExitNode(enabled) && !isExitNode(previousEnabled) && p.allowExitNode !== true) {
      throw new Error(
        `this would approve ${EXIT_NODE_ROUTES.join(" and ")}, making the device an EXIT NODE — ` +
          "a route for all of the tailnet's internet traffic rather than a subnet. Set " +
          "`allowExitNode` to confirm that is intended",
      );
    }

    const withdrawn = previousEnabled.filter((route) => !enabled.includes(route));
    if (withdrawn.length) {
      ctx.log(
        "warn",
        "these routes are no longer enabled — traffic to them stops with no error " +
          "anywhere",
        { deviceId, withdrawn },
      );
    }

    const after = await client.request<{ enabledRoutes?: string[] }>(
      `/device/${encodeURIComponent(deviceId)}/routes`,
      { method: "POST", body: { routes: enabled } },
    );

    const now = after?.enabledRoutes ?? enabled;
    // Accepted, and carrying nothing until the device offers it.
    const notAdvertised = now.filter((route) => !advertised.includes(route));
    if (notAdvertised.length) {
      ctx.log(
        "warn",
        "these routes are enabled and NOT ADVERTISED by the device, so they carry " +
          "no traffic — advertising is set on the machine with `tailscale up --advertise-routes`, " +
          "not through the API",
        { deviceId, notAdvertised },
      );
    }

    return {
      deviceId,
      enabled: now,
      previousEnabled,
      withdrawn,
      notAdvertised,
      isExitNode: isExitNode(now),
      changed: withdrawn.length > 0 || now.some((route) => !previousEnabled.includes(route)),
    };
  },
};

export default action;
