import type { ActionDefinition } from "@w6w/types";
import { csv, NationBuilderClient } from "../lib/client.ts";

interface Input {
  listId: string;
  personIds: string;
}

/** `PATCH /api/v2/lists/{id}/remove_signups` — confirmed against the vendor's OpenAPI spec. */
const listRemovePeople: ActionDefinition<Input> = {
  key: "list-remove-people",
  type: "perform",
  resource: "list",
  title: "Remove People from List",
  description: "Remove one or more people from a custom list.",
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
      `/lists/${encodeURIComponent(input.listId)}/remove_signups`,
      {
        method: "PATCH",
        body: { data: { id: input.listId, type: "lists", signup_ids: ids } },
      },
    );
    return { listId: input.listId };
  },
};

export default listRemovePeople;
