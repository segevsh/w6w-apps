import type { ActionDefinition } from "@w6w/types";
import { TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/device/{deviceId}/authorized` — let a machine in, or push it
 * back out.
 *
 * ## This only means anything if device approval is on
 *
 * Device approval is a tailnet setting. With it off, every device that
 * authenticates is authorized immediately and this action is a no-op that
 * returns 200 — success, and nothing happened. With it on, a new device sits
 * in the tailnet unable to send or receive anything until somebody says yes,
 * and this is the "yes".
 *
 * That is the natural place for a workflow: a device appears, a human approves
 * in Slack, the workflow authorizes it. It beats a standing admin session on
 * the machines page.
 *
 * ## De-authorizing is not removing
 *
 * Setting `authorized: false` cuts a device off while leaving it registered,
 * its key valid and its ACL identity intact. It is the reversible half of
 * `device-delete`, and the right first move when a laptop goes missing and
 * nobody is sure yet.
 */
const action: ActionDefinition = {
  key: "device-authorize",
  type: "perform",
  resource: "device",
  title: "Authorize or de-authorize a device",
  description:
    "Approve a waiting machine, or cut a registered one off. Only meaningful when DEVICE " +
    "APPROVAL is enabled for the tailnet — with it off, everything is authorized on arrival and " +
    "this succeeds without doing anything.",
  idempotent: true,
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
      hint: "The `nodeId` from `device-list`.",
    },
    {
      key: "authorized",
      label: "Authorized",
      type: "boolean",
      default: true,
      hint: "Off cuts the device off without removing it — reversible, unlike `device-delete`.",
    },
  ],
  output: [
    { key: "deviceId", type: "string", label: "Which device" },
    { key: "authorized", type: "boolean", label: "What it is now" },
    { key: "changed", type: "boolean", label: "Whether this call actually changed anything" },
    { key: "hostname", type: "string", label: "The machine, for the record" },
    { key: "approvalRelevant", type: "boolean", label: "False when it was already authorized" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");
    const authorized = p.authorized !== false;

    const client = new TailscaleClient(ctx);

    // Read first, so the result can say whether anything changed — Tailscale
    // returns a bare 200 either way.
    const before = await client.request<{ authorized?: boolean; hostname?: string }>(
      `/device/${encodeURIComponent(deviceId)}`,
    );
    const was = before?.authorized === true;

    await client.request(`/device/${encodeURIComponent(deviceId)}/authorized`, {
      method: "POST",
      body: { authorized },
    });

    if (!authorized) {
      ctx.log(
        "warn",
        "de-authorized a device — it stays registered with its key and its ACL " +
          "identity intact, and can be authorized again",
        { deviceId },
      );
    }

    return {
      deviceId,
      authorized,
      changed: was !== authorized,
      hostname: before?.hostname,
      approvalRelevant: was !== authorized,
    };
  },
};

export default action;
