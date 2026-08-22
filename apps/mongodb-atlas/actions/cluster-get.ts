import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { CLUSTER_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/clusters/{clusterName}` — one cluster.
 *
 * ## The connection string is here, and it is not a credential
 *
 * `connectionStrings.standardSrv` is the `mongodb+srv://…` host a driver
 * connects to. It contains **no username or password** — those come from a
 * database user, which is a separate thing created by `database-user-create`,
 * and neither is any use without the other plus an IP access list entry.
 *
 * Three separate things must line up before an application can connect, and
 * getting one of them wrong produces a timeout rather than an error that says
 * which. That is worth knowing before debugging a connection for an hour.
 *
 * ## `terminationProtectionEnabled` is the field that prevents the worst call
 *
 * When it is on, `cluster-delete` is refused by Atlas itself. It is off by
 * default, which is the wrong default for anything holding data somebody
 * cares about, and this reports it plainly.
 */
const action: ActionDefinition = {
  key: "cluster-get",
  type: "read",
  resource: "cluster",
  title: "Get a cluster",
  description:
    "One cluster, with its connection string, state and whether termination protection is on. " +
    "The connection string carries NO credentials — a database user and an access-list entry " +
    "are separate.",
  params: [PROJECT_PARAM, CLUSTER_PARAM],
  output: [
    { key: "cluster", type: "object", label: "The cluster" },
    { key: "name", type: "string", label: "Its name" },
    { key: "stateName", type: "string", label: "IDLE is the only state that accepts changes" },
    { key: "paused", type: "boolean", label: "Whether compute is stopped" },
    { key: "mongoDBVersion", type: "string", label: "The server version running" },
    { key: "srv", type: "string", label: "The mongodb+srv connection host — no credentials in it" },
    { key: "terminationProtection", type: "boolean", label: "Whether Atlas will refuse a delete" },
    { key: "backupEnabled", type: "boolean", label: "Whether continuous backup is on" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const name = String(p.cluster ?? "").trim();
    if (!name) throw new Error("`cluster` is required");

    const cluster = await new AtlasClient(ctx).request<{
      name?: string;
      stateName?: string;
      paused?: boolean;
      mongoDBVersion?: string;
      backupEnabled?: boolean;
      terminationProtectionEnabled?: boolean;
      connectionStrings?: { standardSrv?: string };
    }>(`/api/atlas/v2/groups/${id}/clusters/${encodeURIComponent(name)}`, {
      version: "2024-08-05",
    });

    if (cluster?.terminationProtectionEnabled !== true) {
      ctx.log(
        "info",
        "this Atlas cluster has termination protection OFF — a delete would not be refused",
        { name },
      );
    }

    return {
      cluster,
      name: cluster?.name,
      stateName: cluster?.stateName,
      paused: cluster?.paused === true,
      mongoDBVersion: cluster?.mongoDBVersion,
      // The host only. Credentials are a database user, and access is an IP entry.
      srv: cluster?.connectionStrings?.standardSrv,
      terminationProtection: cluster?.terminationProtectionEnabled === true,
      backupEnabled: cluster?.backupEnabled === true,
    };
  },
};

export default action;
