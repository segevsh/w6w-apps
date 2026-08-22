import type { ActionDefinition } from "@w6w/types";
import { CloudClient, uuid } from "../lib/client.ts";

/**
 * `GET /v1/organizations/{org}/services/{id}/backups` — what could be restored.
 *
 * ## Backups belong to the service and die with it
 *
 * They are not stored anywhere a deleted service's data could be recovered
 * from. Deleting the service deletes them, which makes "we have backups" a poor
 * answer to "what if we delete the wrong service" — `service-delete` says the
 * same thing from the other side.
 *
 * ## Restoring makes a new service, not an old one
 *
 * A ClickHouse Cloud restore provisions a **new service** from a backup rather
 * than rewinding the existing one. So a restore is a migration — new host, new
 * credentials, everything that connects has to be repointed — and it is why
 * this action lists backups but does not offer to restore one: that is a
 * decision with a cutover attached, not a button.
 *
 * ## `status` is the only field that says whether a backup is usable
 *
 * A backup in progress is listed and cannot be restored from. Counting only the
 * `done` ones is what answers "how far back can we actually go".
 */
const action: ActionDefinition = {
  key: "backup-list",
  type: "read",
  resource: "backup",
  title: "List backups",
  description:
    "A service's backups. They are DELETED WITH THE SERVICE, and restoring one provisions a NEW " +
    "service rather than rewinding this one — so a restore is a migration with a cutover.",
  params: [
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "backups", type: "array", label: "The backups, newest first" },
    { key: "count", type: "number", label: "How many exist" },
    { key: "usableCount", type: "number", label: "How many are finished and restorable" },
    { key: "oldest", type: "string", label: "The furthest back a restore could go" },
    { key: "newest", type: "string", label: "The most recent finished backup" },
    { key: "totalBytes", type: "number", label: "What they occupy" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");

    const backups = await new CloudClient(ctx).request<
      Array<
        {
          id?: string;
          status?: string;
          finishedAt?: string;
          startedAt?: string;
          sizeInBytes?: number;
        }
      >
    >(`/services/${id}/backups`);

    const all = Array.isArray(backups) ? backups : [];
    // A backup in progress is listed and cannot be restored from.
    const usable = all.filter((backup) => backup?.status === "done");
    const times = usable
      .map((backup) => backup?.finishedAt ?? backup?.startedAt)
      .filter((value): value is string => Boolean(value))
      .sort();

    return {
      backups: all,
      count: all.length,
      usableCount: usable.length,
      oldest: times[0],
      newest: times[times.length - 1],
      totalBytes: all.reduce((sum, backup) => sum + Number(backup?.sizeInBytes ?? 0), 0),
    };
  },
};

export default action;
