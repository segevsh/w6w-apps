import type { ActionDefinition } from "@w6w/types";
import { TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/device/{deviceId}/expire` — force a machine to prove itself
 * again.
 *
 * ## What this is for
 *
 * Expiring a device's key logs it out of the tailnet. It cannot reach anything
 * until somebody re-authenticates it on the machine, which for a laptop means
 * a browser login and for an unattended server means a visit.
 *
 * That last part is the trap: this is the right response to a compromised
 * laptop and the wrong one to a headless box in a rack, where there may be
 * nobody to type the login. `device-authorize` with `authorized: false` cuts a
 * device off *without* needing anyone at the far end, and is reversible from
 * here.
 *
 * ## It is not reversible from the API
 *
 * There is no un-expire. The device rejoins by authenticating, or it does not
 * rejoin. That makes this the one device action worth thinking about twice,
 * and it is why the action refuses to run without an explicit confirmation.
 *
 * ## A tagged device's key does not expire on its own
 *
 * Tagging disables key expiry, so a tagged server never faces this by the
 * clock — but it can still be expired deliberately, and then it needs an auth
 * key to come back.
 */
const action: ActionDefinition = {
  key: "device-expire-key",
  type: "perform",
  resource: "device",
  title: "Expire a device's key",
  description: "Log a machine out of the tailnet — it cannot reach anything until somebody " +
    "RE-AUTHENTICATES ON THE DEVICE, which for an unattended server may mean nobody can. There " +
    "is no un-expire; de-authorizing is the reversible alternative.",
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
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "This cannot be undone through the API. The device rejoins only by authenticating " +
        "again, on the machine itself.",
    },
  ],
  output: [
    { key: "deviceId", type: "string", label: "Which device" },
    { key: "hostname", type: "string", label: "The machine, for the record" },
    { key: "expired", type: "boolean", label: "Whether the key was expired" },
    { key: "wasTagged", type: "boolean", label: "A tagged device needs an auth key to return" },
    { key: "hadExpiryDisabled", type: "boolean", label: "Its key would never have expired itself" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to expire this device's key. It logs the machine out of the tailnet, " +
          "there is no un-expire through the API, and an unattended machine may have nobody to " +
          "re-authenticate it — `device-authorize` with `authorized: false` cuts a device off " +
          "reversibly instead",
      );
    }

    const client = new TailscaleClient(ctx);
    const before = await client.request<{
      hostname?: string;
      tags?: string[];
      keyExpiryDisabled?: boolean;
    }>(`/device/${encodeURIComponent(deviceId)}`);

    await client.request(`/device/${encodeURIComponent(deviceId)}/expire`, { method: "POST" });

    const wasTagged = (before?.tags ?? []).length > 0;
    ctx.log(
      "warn",
      "expired a device key — the machine is logged out until somebody " +
        "authenticates it there" + (wasTagged
          ? ", and a tagged device needs an auth key to" +
            " come back"
          : ""),
      { deviceId },
    );

    return {
      deviceId,
      hostname: before?.hostname,
      expired: true,
      wasTagged,
      hadExpiryDisabled: before?.keyExpiryDisabled === true,
    };
  },
};

export default action;
