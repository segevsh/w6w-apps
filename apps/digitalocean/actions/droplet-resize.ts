import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, numericId } from "../lib/client.ts";

/**
 * `POST /v2/droplets/{id}/actions` with `type: "resize"` — change a droplet's
 * size.
 *
 * ## Half of this operation cannot be undone
 *
 * A resize comes in two forms and only one is reversible:
 *
 * - **CPU and RAM only** (`disk: false`) — reversible. The droplet can be
 *   resized back down afterwards.
 * - **Including the disk** (`disk: true`) — **permanent**. The disk grows and
 *   can never be made smaller again. The droplet is stuck at or above that size
 *   for the rest of its life, and so is its price floor.
 *
 * The two differ by one boolean, and DigitalOcean's default for that boolean is
 * `false` — which is the safe one, and worth keeping. This action therefore
 * defaults to the reversible form and gates the other.
 *
 * ## The droplet must be powered off first
 *
 * A resize on a running droplet is rejected. That is not a formality: the
 * droplet is unavailable for the whole operation, which on a large disk is
 * tens of minutes.
 *
 * ## The action is asynchronous and the droplet stays off
 *
 * When the resize finishes the droplet is still powered off. Something has to
 * turn it back on, and a workflow that resizes and walks away leaves it down.
 */
const action: ActionDefinition = {
  key: "droplet-resize",
  type: "perform",
  resource: "droplet",
  title: "Resize a droplet",
  description:
    "Resize a droplet. Including the DISK is PERMANENT — it can never be shrunk again, and " +
    "neither can the price floor — so this defaults to the CPU-and-RAM-only form, which is " +
    "reversible. The droplet must be off, and stays off afterwards.",
  idempotent: true,
  params: [
    {
      key: "dropletId",
      label: "Droplet ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "size",
      label: "New Size",
      type: "string",
      required: true,
      default: "",
      placeholder: "s-2vcpu-4gb",
    },
    {
      key: "resizeDisk",
      label: "Resize the disk too",
      type: "boolean",
      default: false,
      hint: "PERMANENT. The disk grows and can never be reduced, so the droplet cannot be " +
        "resized below this size again.",
    },
    {
      key: "confirmPermanent",
      label: "I accept that the disk can never be shrunk",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "resizeDisk" }, true] },
    },
  ],
  output: [
    { key: "actionId", type: "number", label: "The action, which is still in progress" },
    { key: "status", type: "string", label: "in-progress" },
    { key: "diskResized", type: "boolean", label: "True when the change was permanent" },
    { key: "reversible", type: "boolean", label: "False when the disk was included" },
    { key: "previousSize", type: "string", label: "What it was before" },
    { key: "willStayOff", type: "boolean", label: "Always true — something must power it on" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = numericId(p.dropletId, "dropletId");
    const size = String(p.size ?? "").trim();
    if (!size) throw new Error("`size` is required");

    const resizeDisk = p.resizeDisk === true;
    if (resizeDisk && p.confirmPermanent !== true) {
      throw new Error(
        "set `confirmPermanent` — resizing the disk is irreversible. The disk grows and can " +
          "never be made smaller, so this droplet can never be resized below the new size again, " +
          "and neither can what it costs. Leaving `resizeDisk` off changes CPU and RAM only, " +
          "which can be undone",
      );
    }

    const client = new DigitalOceanClient(ctx);

    // A resize on a running droplet is rejected, and the reason is worth
    // stating rather than passing through.
    const before = await client.request<{ droplet?: { status?: string; size_slug?: string } }>(
      `/v2/droplets/${id}`,
    );
    const status = String(before?.droplet?.status ?? "");
    if (status !== "off") {
      throw new Error(
        `this droplet is \`${status}\` and a resize needs it powered off. That is not a ` +
          "formality — the droplet is unavailable for the whole operation, which on a large " +
          "disk is tens of minutes. `droplet-power` with `shutdown` is the graceful way to get " +
          "there",
      );
    }

    const body = await client.request<{ action?: { id?: number; status?: string } }>(
      `/v2/droplets/${id}/actions`,
      { method: "POST", body: { type: "resize", size, disk: resizeDisk } },
    );

    ctx.log(
      resizeDisk ? "warn" : "info",
      resizeDisk
        ? "resized a droplet INCLUDING its disk — this cannot be undone"
        : "resized a droplet's CPU and RAM, which can be undone",
      { id, size, resizeDisk },
    );

    return {
      actionId: body?.action?.id,
      status: body?.action?.status,
      diskResized: resizeDisk,
      reversible: !resizeDisk,
      previousSize: before?.droplet?.size_slug,
      // The droplet is still off when the resize finishes.
      willStayOff: true,
    };
  },
};

export default action;
