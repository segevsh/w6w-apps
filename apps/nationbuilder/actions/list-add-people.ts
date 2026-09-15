import type { ActionDefinition } from "@w6w/types";
import { csv, NationBuilderClient } from "../lib/client.ts";

interface Input {
  listId: string;
  personIds: string;
}

/**
 * `PATCH /api/v2/lists/{id}/add_signups` — confirmed against the vendor's
 * OpenAPI spec. Adding the same person twice is a no-op on NationBuilder's
 * side (list membership, not a log entry), so this is safe to retry.
 */
const listAddPeople: ActionDefinition<Input> = {
  key: "list-add-people",
  type: "perform",
  resource: "list",
  title: "Add People to List",
  description: "Add one or more people to a custom list.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "personIds",
      label: "Person IDs",
      type: "string",
      required: true,
      hint: "Comma-separated person IDs, e.g. 12,45,90.",
    },
  ],
  output: [{ key: "listId", type: "string", label: "List ID" }],

  async execute(input, ctx) {
    const ids = csv(input.personIds);
    if (!ids || ids.length === 0) throw new Error("`personIds` must list at least one ID");
    await new NationBuilderClient(ctx).request(
      `/lists/${encodeURIComponent(input.listId)}/add_signups`,
      {
        method: "PATCH",
        body: { data: { id: input.listId, type: "lists", signup_ids: ids } },
      },
    );
    return { listId: input.listId };
  },
};

export default listAddPeople;
