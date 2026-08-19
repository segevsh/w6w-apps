import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, numericId } from "../lib/client.ts";

/**
 * `POST /v2/droplets/{id}/actions` with `type: "snapshot"` — the only way back
 * from destroying a droplet.
 *
 * ## Take one before anything irreversible
 *
 * There is no recycle bin for a droplet and no undo for a disk resize. A
 * snapshot is the only route back from either, and it has to exist beforehand.
 *
 * ## It bills forever, and that is the trade
 *
 * Per gigabyte per month, with no expiry, until somebody deletes it. So the
 * honest framing is: a snapshot is insurance with a monthly premium and no
 * cancellation date. Taking one before a risky operation is right; leaving it
 * there for two years afterwards is where the cost comes from, and nothing will
 * remind anybody.
 *
 * ## The droplet should be powered off, and this warns rather than refusing
 *
 * A snapshot of a running droplet is allowed and is crash-consistent — the same
 * state a machine would be in after a power cut, with whatever was in memory
 * lost. For a database that is a restore that may need recovery. Powering the
 * droplet off first makes it clean, and costs downtime.
 *
 * DigitalOcean allows both, so this allows both and says which one is
 * happening.
 */
const action: ActionDefinition = {
  key: "snapshot-create",
  type: "perform",
  resource: "snapshot",
  title: "Snapshot a droplet",
  description:
    "Take a snapshot — the only way back from destroying a droplet or resizing its disk. It " +
    "bills per gigabyte per month FOREVER, and a snapshot of a running droplet is " +
    "crash-consistent rather than clean.",
  idempotent: false,
  params: [
    {
      key: "dropletId",
      label: "Droplet ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "name",
      label: "Snapshot Name",
      type: "string",
      required: true,
      default: "",
      hint: "The only description it will ever have, and nothing else records why it was taken.",
    },
  ],
  output: [
    { key: "actionId", type: "number", label: "The action, which is still in progress" },
    { key: "status", type: "string", label: "in-progress — the snapshot does not exist yet" },
    { key: "crashConsistent", type: "boolean", label: "True when the droplet was running" },
    { key: "billsMonthly", type: "boolean", label: "Always true, with no expiry" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = numericId(p.dropletId, "dropletId");
    const name = String(p.name ?? "").trim();
    if (!name) {
      throw new Error(
        "`name` is required — it is the only description the snapshot will ever have, and " +
          "nothing else records why it was taken",
      );
    }

    const client = new DigitalOceanClient(ctx);
    const before = await client.request<{ droplet?: { status?: string } }>(`/v2/droplets/${id}`);
    // Allowed, and crash-consistent rather than clean.
    const crashConsistent = before?.droplet?.status !== "off";

    const body = await client.request<{ action?: { id?: number; status?: string } }>(
      `/v2/droplets/${id}/actions`,
      { method: "POST", body: { type: "snapshot", name } },
    );

    ctx.log(
      crashConsistent ? "warn" : "info",
      crashConsistent
        ? "snapshotting a RUNNING droplet — the result is crash-consistent, as though the power " +
          "had been cut, so a database in it may need recovery on restore"
        : "snapshotting a powered-off droplet",
      { id },
    );

    return {
      actionId: body?.action?.id,
      status: body?.action?.status,
      crashConsistent,
      // Per gigabyte per month, with no expiry, until somebody deletes it.
      billsMonthly: true,
    };
  },
};

export default action;
