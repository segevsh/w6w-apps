import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, compact, json, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /api/atlas/v2/groups/{groupId}/clusters` — provision a cluster.
 *
 * ## This one costs money, per hour, until somebody stops it
 *
 * A dedicated cluster bills from the moment it is created. An M30 across three
 * nodes is not a rounding error, and nothing in the API asks twice. So this
 * action requires the instance size to be named explicitly — no default tier —
 * and turns **termination protection on by default**, against Atlas's own
 * default, because a cluster created by an automation is one nobody is
 * watching.
 *
 * ## The sizing shape is nested three deep, and this flattens it
 *
 * Atlas wants `replicationSpecs[].regionConfigs[]` with `electableSpecs`,
 * `priority`, `providerName` and `regionName`. That is the right shape for a
 * multi-region, multi-cloud cluster and a lot of ceremony for the single-region
 * one almost every workflow wants, so the common case is expressed as three
 * parameters here and assembled below. `replicationSpecs` is available raw for
 * anything more elaborate.
 *
 * ## Creation is asynchronous and takes minutes
 *
 * The call returns immediately with `stateName: "CREATING"`. The cluster is not
 * connectable, and any further change to it answers **409** until it reaches
 * `IDLE`. A workflow that creates and then immediately configures needs to
 * wait in between — `cluster-get` reports the state.
 *
 * ## Three things must line up before anything can connect
 *
 * The cluster, a **database user** (`database-user-create`), and an **IP
 * access-list entry** (`access-list-add`). Missing either of the last two
 * produces a connection timeout rather than an error naming the cause.
 */
const action: ActionDefinition = {
  key: "cluster-create",
  type: "perform",
  resource: "cluster",
  title: "Create a cluster",
  description:
    "Provision a dedicated cluster, which BILLS PER HOUR from creation. Termination protection " +
    "is on by default here, against Atlas's own default. Creation takes minutes and the cluster " +
    "refuses changes until it is IDLE.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "The identifier — it cannot be changed afterwards.",
    },
    {
      key: "instanceSize",
      label: "Instance Size",
      type: "string",
      required: true,
      default: "",
      placeholder: "M10",
      hint: "Named explicitly on purpose — there is no safe default for something that bills " +
        "hourly. M10 upwards are dedicated; the shared tiers are flex clusters, elsewhere.",
    },
    {
      key: "provider",
      label: "Cloud Provider",
      type: "select",
      required: true,
      default: "AWS",
      options: [
        { value: "AWS", label: "AWS" },
        { value: "GCP", label: "Google Cloud" },
        { value: "AZURE", label: "Azure" },
      ],
    },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "",
      placeholder: "EU_WEST_1",
      hint: "Atlas's own region names, which are UPPER_SNAKE — `EU_WEST_1`, not `eu-west-1`.",
    },
    {
      key: "terminationProtection",
      label: "Termination Protection",
      type: "boolean",
      default: true,
      hint: "ON by default here. Atlas defaults it off; with it on, a delete is refused until " +
        "somebody turns it off deliberately.",
    },
    {
      key: "backupEnabled",
      label: "Backup",
      type: "boolean",
      default: true,
    },
    {
      key: "mongoDBMajorVersion",
      label: "MongoDB Version",
      type: "string",
      default: "",
      advanced: true,
      hint: "Blank takes the current default, which moves.",
    },
    {
      key: "replicationSpecs",
      label: "Replication Specs",
      type: "json",
      default: "",
      advanced: true,
      hint: "The raw shape, for multi-region or multi-cloud. Replaces the provider, region and " +
        "size above entirely.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. [{"key":"env","value":"staging"}] — the only thing that makes an Atlas bill ' +
        "attributable later.",
    },
  ],
  output: [
    { key: "cluster", type: "object", label: "The cluster as created" },
    { key: "name", type: "string", label: "Its name" },
    { key: "stateName", type: "string", label: "CREATING — it is not connectable yet" },
    { key: "terminationProtection", type: "boolean", label: "Whether a delete will be refused" },
    { key: "id", type: "string", label: "Its id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const raw = json(p.replicationSpecs, "replicationSpecs");
    let replicationSpecs: unknown;
    if (raw !== undefined) {
      if (!Array.isArray(raw)) throw new Error("`replicationSpecs` must be an array");
      replicationSpecs = raw;
    } else {
      const instanceSize = String(p.instanceSize ?? "").trim();
      const region = String(p.region ?? "").trim();
      if (!instanceSize) {
        throw new Error(
          "`instanceSize` is required — this provisions hardware that bills hourly, so there is " +
            "no default tier",
        );
      }
      if (!region) throw new Error("`region` is required");
      // The single-region case, assembled into the shape Atlas wants.
      replicationSpecs = [{
        regionConfigs: [{
          providerName: String(p.provider ?? "AWS"),
          regionName: region,
          priority: 7,
          electableSpecs: { instanceSize, nodeCount: 3 },
        }],
      }];
    }

    const terminationProtection = p.terminationProtection !== false;
    const body = compact({
      name,
      clusterType: "REPLICASET",
      replicationSpecs,
      mongoDBMajorVersion: p.mongoDBMajorVersion,
      tags: json(p.tags, "tags"),
    });
    // Both are meaningful when false, so they are set rather than compacted.
    body.terminationProtectionEnabled = terminationProtection;
    body.backupEnabled = p.backupEnabled !== false;

    const cluster = await new AtlasClient(ctx).request<{
      id?: string;
      name?: string;
      stateName?: string;
      terminationProtectionEnabled?: boolean;
    }>(`/api/atlas/v2/groups/${id}/clusters`, {
      method: "POST",
      version: "2024-10-23",
      body,
    });

    ctx.log(
      "warn",
      "created an Atlas cluster — it bills per hour from now, and takes minutes to become IDLE",
      { name, terminationProtection },
    );

    return {
      cluster,
      name: cluster?.name ?? name,
      stateName: cluster?.stateName,
      terminationProtection: cluster?.terminationProtectionEnabled === true,
      id: cluster?.id,
    };
  },
};

export default action;
