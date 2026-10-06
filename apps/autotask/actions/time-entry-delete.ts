import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";

/**
 * `DELETE /TimeEntries/{id}` — remove a time entry.
 *
 * Time entries are the one common entity the swagger lets a caller delete at the root; most
 * others (tickets, companies, contacts) have no DELETE at all. Deleting is permanent and a
 * billed entry may be refused by the API.
 */
const action: ActionDefinition = {
  key: "time-entry-delete",
  type: "perform",
  resource: "time-entry",
  title: "Delete time entry",
  description:
    "Permanently delete a time entry. Idempotent in effect: a second delete of the same id " +
    "fails with the API's own error rather than deleting anything else.",
  idempotent: true,
  params: [{ key: "id", label: "Time entry ID", type: "number", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the API accepted the delete" },
    { key: "id", type: "number", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    const id = Number((input as Record<string, unknown>).id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("`id` must be a positive integer");
    await new AutotaskClient(ctx).call("DELETE", `/TimeEntries/${id}`);
    return { deleted: true, id };
  },
};

export default action;
