import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, numericId } from "../lib/client.ts";

/**
 * `DELETE /v2/droplets/{id}` — destroy a droplet.
 *
 * ## What it does not destroy is the point
 *
 * Destroying a droplet stops its charge. It leaves behind, still billing and no
 * longer attached to anything that would remind anybody they exist:
 *
 * - **Volumes.** Block storage attached to the droplet is a separate resource.
 *   It survives, keeps billing per gigabyte, and is now an orphan.
 * - **Snapshots.** Both droplet snapshots and volume snapshots outlive their
 *   source, and each is charged per gigabyte per month, indefinitely.
 * - **Reserved IPs.** An address assigned to the droplet becomes unassigned —
 *   and an unassigned reserved IP is the state DigitalOcean **charges for**.
 *
 * This is the most common way a DigitalOcean bill grows while nobody adds
 * anything: a year of tearing down droplets and leaving their storage behind.
 *
 * So this action counts what will be orphaned before destroying anything, and
 * puts the number in front of the caller.
 *
 * ## Destroying is immediate and there is no recycle bin
 *
 * The droplet and its local disk are gone. Only a snapshot taken beforehand is
 * a way back, and taking one is `snapshot-create`.
 */
const action: ActionDefinition = {
  key: "droplet-delete",
  type: "perform",
  resource: "droplet",
  title: "Destroy a droplet",
  description:
    "Destroy a droplet, which stops its charge. Its VOLUMES, SNAPSHOTS and RESERVED IP survive " +
    "and keep billing — an unassigned reserved IP is the state that costs — so this counts what " +
    "would be orphaned first.",
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
      key: "confirmName",
      label: "Type the droplet name",
      type: "string",
      required: true,
      default: "",
      hint: "The name, not the id. There is no recycle bin and the local disk goes with it.",
    },
    {
      key: "acknowledgeOrphans",
      label: "Volumes I expect to be left behind",
      type: "number",
      default: 0,
      hint: "Checked against the droplet's attached volumes. They survive, keep billing, and " +
        "stop being attached to anything that would remind you.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Destroyed" },
    { key: "id", type: "number", label: "The droplet id" },
    { key: "name", type: "string", label: "What was destroyed" },
    { key: "orphanedVolumeIds", type: "array", label: "Volumes still billing, now unattached" },
    { key: "orphanedVolumeCount", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = numericId(p.dropletId, "dropletId");

    const client = new DigitalOceanClient(ctx);
    const before = await client.request<{
      droplet?: { name?: string; volume_ids?: string[] };
    }>(`/v2/droplets/${id}`);
    const name = String(before?.droplet?.name ?? "");
    // These are separate resources and survive the droplet.
    const volumes = before?.droplet?.volume_ids ?? [];

    if (String(p.confirmName ?? "").trim() !== name) {
      throw new Error(
        `\`confirmName\` must match the droplet name exactly — got ` +
          `"${String(p.confirmName ?? "").trim()}" for "${name}"`,
      );
    }

    const expected = Number(p.acknowledgeOrphans ?? 0);
    if (volumes.length !== expected) {
      throw new Error(
        `this droplet has ${volumes.length} volume(s) attached and \`acknowledgeOrphans\` is ` +
          `${expected}. Set it to ${volumes.length} to proceed. Destroying the droplet does NOT ` +
          "destroy them — they survive, keep billing per gigabyte, and are no longer attached " +
          "to anything that would remind you they are there",
      );
    }

    await client.request(`/v2/droplets/${id}`, { method: "DELETE" });

    ctx.log(
      "warn",
      volumes.length
        ? "destroyed a droplet — its volumes survive and keep billing"
        : "destroyed a droplet",
      { id, orphanedVolumeCount: volumes.length },
    );

    return {
      deleted: true,
      id,
      name,
      orphanedVolumeIds: volumes,
      orphanedVolumeCount: volumes.length,
    };
  },
};

export default action;
