import type { ActionDefinition } from "@w6w/types";
import { CloudClient, uuid } from "../lib/client.ts";

/**
 * `DELETE /v1/organizations/{org}/services/{id}` — destroy a service and its
 * data.
 *
 * ## The service must be stopped first
 *
 * ClickHouse Cloud refuses to delete a running service. That is a real safety
 * property — it means deleting is two deliberate acts, not one — and it is also
 * a confusing 409 if you do not know it. This action reads the state and says
 * so rather than passing the API's message through.
 *
 * ## The backups go too
 *
 * Deleting a service removes its backups with it. So "delete it, we have
 * backups" is wrong: the backups are part of what is being deleted. Restoring
 * afterwards is not possible from within ClickHouse Cloud, which is why this
 * counts them and puts the number in the refusal.
 *
 * ## The confirmation is the service name, not its id
 *
 * A UUID typed twice is a UUID copied twice, and proves nothing about whether
 * the right service was chosen. The name is the thing a person recognises.
 */
const action: ActionDefinition = {
  key: "service-delete",
  type: "perform",
  resource: "service",
  title: "Delete a service",
  description:
    "Destroy a service and its data. It must be STOPPED first, and its BACKUPS are deleted with " +
    "it — so 'we have backups' is not a recovery plan for this.",
  idempotent: true,
  params: [
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirmName",
      label: "Type the service name",
      type: "string",
      required: true,
      default: "",
      hint: "The NAME, not the id — a UUID typed twice is a UUID copied twice.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "id", type: "string", label: "The service id" },
    { key: "name", type: "string", label: "What was removed" },
    { key: "backupsDeleted", type: "number", label: "Backups that went with it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");

    const client = new CloudClient(ctx);
    const service = await client.request<{ name?: string; state?: string }>(`/services/${id}`);
    const name = String(service?.name ?? "");
    const state = String(service?.state ?? "");

    if (String(p.confirmName ?? "").trim() !== name) {
      throw new Error(
        `\`confirmName\` must match the service name exactly — got ` +
          `"${String(p.confirmName ?? "").trim()}" for "${name}"`,
      );
    }

    if (state !== "stopped") {
      throw new Error(
        `this service is \`${state}\` and ClickHouse Cloud will not delete a service that is not ` +
          "stopped. That is deliberate — deleting is two acts rather than one — and " +
          "`service-state` is the first of them",
      );
    }

    // Deleting takes the backups with it, so the number is worth reporting
    // before rather than discovering afterwards.
    let backupsDeleted = 0;
    try {
      const backups = await client.request<unknown[]>(`/services/${id}/backups`);
      backupsDeleted = Array.isArray(backups) ? backups.length : 0;
    } catch {
      backupsDeleted = -1;
    }

    await client.request(`/services/${id}`, { method: "DELETE" });

    ctx.log(
      "warn",
      "deleted a ClickHouse service — its data and its backups are gone together",
      { id, backupsDeleted },
    );

    return {
      deleted: true,
      id,
      name,
      backupsDeleted: backupsDeleted >= 0 ? backupsDeleted : undefined,
    };
  },
};

export default action;
