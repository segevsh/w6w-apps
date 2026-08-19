import type { ActionDefinition } from "@w6w/types";
import { isExitNode, TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/device/{deviceId}/routes` — what a machine offers to route, and
 * what it is actually allowed to.
 *
 * ## Two lists, and a route needs to be in both
 *
 * **Advertised** is what the device offers, set with `tailscale up
 * --advertise-routes` on the machine itself. **Enabled** is what an admin has
 * approved. Traffic flows only where the two overlap, and the two failure
 * modes look nothing alike:
 *
 * - Advertised but not enabled — the subnet router is running, configured, and
 *   carrying nothing. Nothing is broken and nothing works.
 * - Enabled but not advertised — approved in the console for a route the
 *   device no longer offers, usually because somebody restarted Tailscale
 *   without the flag. The approval sits there looking correct.
 *
 * This action returns the overlap and both differences explicitly, because
 * that comparison is the whole diagnostic.
 *
 * ## `0.0.0.0/0` plus `::/0` is an exit node
 *
 * The same field, the same shape, and a completely different meaning: not "the
 * office subnet is reachable" but "this machine can carry the entire internet
 * traffic of anyone in the tailnet who selects it".
 */
const action: ActionDefinition = {
  key: "device-routes-get",
  type: "read",
  resource: "route",
  title: "Get a device's routes",
  description:
    "What a machine ADVERTISES against what an admin has ENABLED — traffic flows only where the " +
    "two overlap, and each half alone is a subnet router that silently carries nothing. Says " +
    "whether the device is acting as an exit node.",
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "advertised", type: "array", label: "Offered by the device itself" },
    { key: "enabled", type: "array", label: "Approved by an admin" },
    { key: "active", type: "array", label: "In both — the routes actually carrying traffic" },
    { key: "advertisedNotEnabled", type: "array", label: "Offered and never approved" },
    { key: "enabledNotAdvertised", type: "array", label: "Approved for something not on offer" },
    { key: "isExitNode", type: "boolean", label: "Carries all traffic for whoever selects it" },
    { key: "advertisesExitNode", type: "boolean", label: "Offers to, and awaits approval" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");

    const routes = await new TailscaleClient(ctx).request<{
      advertisedRoutes?: string[];
      enabledRoutes?: string[];
    }>(`/device/${encodeURIComponent(deviceId)}/routes`);

    const advertised = routes?.advertisedRoutes ?? [];
    const enabled = routes?.enabledRoutes ?? [];
    // Only the overlap carries traffic; each difference is its own failure.
    const active = enabled.filter((route) => advertised.includes(route));

    return {
      advertised,
      enabled,
      active,
      advertisedNotEnabled: advertised.filter((route) => !enabled.includes(route)),
      enabledNotAdvertised: enabled.filter((route) => !advertised.includes(route)),
      isExitNode: isExitNode(active),
      advertisesExitNode: isExitNode(advertised),
    };
  },
};

export default action;
