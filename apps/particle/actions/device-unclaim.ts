import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v1/devices/{id}` — remove a device from the account.
 *
 * ## Unclaiming does not touch the device
 *
 * The firmware stays. The credentials stay. The device carries on connecting to
 * the Particle cloud exactly as before — it simply no longer belongs to this
 * account, so this account can no longer see it, call it or read from it.
 *
 * That is the opposite of what "delete" suggests, and both halves matter:
 *
 * - It is **not** a way to decommission hardware. A device unclaimed and thrown
 *   in a drawer keeps connecting and, on cellular, keeps using data.
 * - It is **not** destructive to the device. Reclaiming it later restores
 *   everything, because nothing on the device changed.
 *
 * ## What it does end is the account's access, immediately
 *
 * Any workflow calling functions on this device stops working at once, with a
 * 403 rather than anything about the device having been removed.
 *
 * ## A product device is not unclaimed this way
 *
 * Devices in a product belong to the product. Removing one is a product-scoped
 * operation, and this path applies to an account's own claimed devices.
 */
const action: ActionDefinition = {
  key: "device-unclaim",
  type: "perform",
  resource: "device",
  title: "Unclaim a device",
  description:
    "Remove a device from this account. The DEVICE IS UNTOUCHED — same firmware, still " +
    "connecting, still using cellular data — it just no longer belongs here. Not a way to " +
    "decommission hardware.",
  idempotent: true,
  params: [
    DEVICE_PARAM,
    {
      key: "confirmName",
      label: "Type the device name",
      type: "string",
      required: true,
      default: "",
      hint: "The name, not the id — an id typed twice is an id copied twice.",
    },
  ],
  output: [
    { key: "unclaimed", type: "boolean", label: "Whether it was removed from the account" },
    { key: "id", type: "string", label: "The device id" },
    { key: "name", type: "string", label: "What it was called" },
    { key: "stillConnecting", type: "boolean", label: "Always true — unclaiming does not stop it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);

    const client = new ParticleClient(ctx);
    const device = await client.request<{ name?: string; cellular?: boolean }>(`/v1/devices/${id}`);
    const name = String(device?.name ?? "");

    if (String(p.confirmName ?? "").trim() !== name) {
      throw new Error(
        `\`confirmName\` must match the device name exactly — got ` +
          `"${String(p.confirmName ?? "").trim()}" for "${name}"`,
      );
    }

    await client.request(`/v1/devices/${id}`, { method: "DELETE" });

    ctx.log(
      "warn",
      "unclaimed a Particle device — this account can no longer reach it, and the device itself " +
        "carries on connecting exactly as before" +
        (device?.cellular ? ", including using cellular data" : ""),
      { id },
    );

    return {
      unclaimed: true,
      id,
      name,
      // Nothing about the device changed; only who owns it.
      stillConnecting: true,
    };
  },
};

export default action;
