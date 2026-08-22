import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, numericId } from "../lib/client.ts";

/**
 * `POST /v2/droplets/{id}/actions` — power a droplet on, off or round.
 *
 * ## `power_off` is pulling the plug, and `shutdown` is not
 *
 * This is the distinction that matters and the names do not convey it:
 *
 * - **`shutdown`** sends an ACPI signal and lets the operating system stop
 *   cleanly. It can fail — a hung machine ignores it — and then nothing
 *   happens.
 * - **`power_off`** cuts the power. It always works, and it risks exactly what
 *   pulling the plug on a server risks: unflushed writes lost, filesystems left
 *   dirty, databases recovering on next boot.
 *
 * DigitalOcean's own documentation warns about this. So this action defaults to
 * `shutdown` and gates `power_off` behind an acknowledgement, which is the
 * reverse of how convenient they are to type.
 *
 * ## Powering off does not stop the bill
 *
 * A droplet in status `off` is charged exactly as one that is running. There is
 * no cost reason to power a droplet down, and this says so — because "turn it
 * off overnight" is a thing people do here expecting savings that do not come.
 *
 * ## The action is asynchronous
 *
 * The response is an action in `in-progress`, not a droplet that has finished
 * changing state.
 */
const action: ActionDefinition = {
  key: "droplet-power",
  type: "perform",
  resource: "droplet",
  title: "Power a droplet",
  description:
    "Power a droplet on, shut it down gracefully, or CUT ITS POWER. `power_off` is pulling the " +
    "plug and risks filesystem damage, so it is gated. And none of this stops the bill — only " +
    "destroying a droplet does.",
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
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "shutdown",
      options: [
        { value: "power_on", label: "Power on" },
        { value: "shutdown", label: "Shut down — graceful, and can fail on a hung machine" },
        { value: "power_off", label: "Power off — cuts power, risks filesystem damage" },
        { value: "reboot", label: "Reboot — graceful" },
        { value: "power_cycle", label: "Power cycle — a hard off and on" },
      ],
    },
    {
      key: "confirmHardPower",
      label: "I accept the risk of an unclean stop",
      type: "boolean",
      default: false,
      showIf: { "in": [{ var: "action" }, ["power_off", "power_cycle"]] },
      hint: "Unflushed writes are lost and filesystems are left dirty, exactly as if the plug " +
        "were pulled.",
    },
  ],
  output: [
    { key: "actionId", type: "number", label: "The action, which is still in progress" },
    { key: "status", type: "string", label: "in-progress — the droplet has not finished yet" },
    { key: "type", type: "string", label: "What was requested" },
    { key: "stillBilling", type: "boolean", label: "Always true — powering off does not stop it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = numericId(p.dropletId, "dropletId");
    const type = String(p.action ?? "shutdown");

    const hard = type === "power_off" || type === "power_cycle";
    if (hard && p.confirmHardPower !== true) {
      throw new Error(
        `set \`confirmHardPower\` — \`${type}\` cuts the power rather than asking the operating ` +
          "system to stop. Unflushed writes are lost and filesystems are left dirty, exactly as " +
          "if the plug were pulled. `shutdown` is the graceful one, and it can fail on a hung " +
          "machine, which is the trade",
      );
    }

    const body = await new DigitalOceanClient(ctx).request<{
      action?: { id?: number; status?: string; type?: string };
    }>(`/v2/droplets/${id}/actions`, { method: "POST", body: { type } });

    ctx.log(
      hard ? "warn" : "info",
      hard
        ? `cut power to a droplet with \`${type}\` — an unclean stop`
        : `requested \`${type}\` on a droplet`,
      { id, type },
    );

    return {
      actionId: body?.action?.id,
      status: body?.action?.status,
      type: body?.action?.type,
      // There is no cost reason to power a droplet down.
      stillBilling: true,
    };
  },
};

export default action;
