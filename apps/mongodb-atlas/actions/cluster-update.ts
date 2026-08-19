import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, emptyToUndefined, json, projectId } from "../lib/client.ts";
import { CLUSTER_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /api/atlas/v2/groups/{groupId}/clusters/{clusterName}` — change a
 * cluster.
 *
 * ## Scaling is a real operation with real consequences
 *
 * Changing the instance size rebuilds the cluster's nodes one at a time. That
 * is designed to be non-disruptive and it is not free: it takes tens of
 * minutes, there is a primary election in the middle of it, and any client
 * without retryable writes sees errors during that window. Scaling **down**
 * additionally reduces disk, and Atlas refuses it outright if the data no
 * longer fits.
 *
 * ## `stateName` must be `IDLE`, and it usually is not right after a change
 *
 * Every modification puts the cluster in `UPDATING` for minutes. A second
 * change during that window is a **409**, not a queue. This action reads the
 * state first and says so plainly, rather than passing Atlas's own message
 * through.
 *
 * ## Turning termination protection off is its own decision
 *
 * It exists to make `cluster-delete` fail. Turning it off is therefore the
 * first half of deleting a cluster, and this action asks for that to be
 * acknowledged — so it cannot be done incidentally while changing something
 * else.
 */
const action: ActionDefinition = {
  key: "cluster-update",
  type: "perform",
  resource: "cluster",
  title: "Update a cluster",
  description:
    "Change a cluster's size, backup or protection settings. Scaling rebuilds nodes over tens of " +
    "minutes with a primary election in the middle, and the cluster refuses further changes " +
    "until it is IDLE again.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    CLUSTER_PARAM,
    {
      key: "instanceSize",
      label: "Instance Size",
      type: "string",
      default: "",
      placeholder: "M20",
      hint: "Rebuilds the nodes one at a time. Scaling DOWN is refused if the data no longer fits.",
    },
    {
      key: "backupEnabled",
      label: "Backup",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "On" },
        { value: "false", label: "Off" },
      ],
    },
    {
      key: "terminationProtection",
      label: "Termination Protection",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "On — deletes are refused" },
        { value: "false", label: "Off — deletes are allowed" },
      ],
    },
    {
      key: "confirmUnprotect",
      label: "I am turning off the thing that prevents deletion",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "terminationProtection" }, "false"] },
    },
    {
      key: "replicationSpecs",
      label: "Replication Specs",
      type: "json",
      default: "",
      advanced: true,
      hint: "The raw shape, for changing regions or topology.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "cluster", type: "object", label: "The cluster as it now stands" },
    { key: "name", type: "string", label: "Its name" },
    { key: "stateName", type: "string", label: "UPDATING while the change applies" },
    { key: "changed", type: "array", label: "The fields this call submitted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const name = String(p.cluster ?? "").trim();
    if (!name) throw new Error("`cluster` is required");

    const protection = String(p.terminationProtection ?? "").trim();
    if (protection === "false" && p.confirmUnprotect !== true) {
      throw new Error(
        "set `confirmUnprotect` — termination protection exists to make `cluster-delete` fail, " +
          "so turning it off is the first half of deleting this cluster and should not happen " +
          "as a side effect of another change",
      );
    }

    const backup = String(p.backupEnabled ?? "").trim();
    const specs = json(p.replicationSpecs, "replicationSpecs");
    if (specs !== undefined && !Array.isArray(specs)) {
      throw new Error("`replicationSpecs` must be an array");
    }

    const size = String(p.instanceSize ?? "").trim();
    const body = emptyToUndefined({
      replicationSpecs: specs ?? (size
        ? [{
          regionConfigs: [{ electableSpecs: { instanceSize: size } }],
        }]
        : undefined),
      backupEnabled: backup === "" ? undefined : backup === "true",
      terminationProtectionEnabled: protection === "" ? undefined : protection === "true",
      tags: json(p.tags, "tags"),
    });
    if (!body) throw new Error("nothing to change — give at least one setting");

    const client = new AtlasClient(ctx);
    const path = `/api/atlas/v2/groups/${id}/clusters/${encodeURIComponent(name)}`;

    // Atlas answers 409 for a change during UPDATING; saying which state it is
    // in is more use than passing that through.
    const before = await client.request<{ stateName?: string }>(path, { version: "2024-08-05" });
    const state = String(before?.stateName ?? "");
    if (state && state !== "IDLE") {
      throw new Error(
        `this cluster is \`${state}\` and will refuse a change — only an IDLE cluster accepts ` +
          "one, and a cluster stays UPDATING for minutes after any previous change",
      );
    }

    const cluster = await client.request<{ name?: string; stateName?: string }>(path, {
      method: "PATCH",
      version: "2024-08-05",
      body,
    });

    ctx.log(
      size ? "warn" : "info",
      size
        ? "resized an Atlas cluster — the nodes rebuild over tens of minutes, with a primary election"
        : "updated an Atlas cluster",
      { name, fields: Object.keys(body) },
    );

    return {
      cluster,
      name: cluster?.name ?? name,
      stateName: cluster?.stateName,
      changed: Object.keys(body),
    };
  },
};

export default action;
