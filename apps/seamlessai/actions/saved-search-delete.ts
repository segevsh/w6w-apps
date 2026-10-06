import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `DELETE /api/client/v2/saved-searches/{id}` — Delete Saved Search. */
interface Input {
  id: string;
}

const savedSearchDelete: ActionDefinition<Input> = {
  key: "saved-search-delete",
  type: "perform",
  resource: "saved-search",
  title: "Delete Saved Search",
  description: "Delete a saved search.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Saved search ID",
      type: "string",
      required: true,
      hint: "Saved search ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "DELETE",
      `/saved-searches/${segment(input.id, "Saved search ID")}`,
    );
  },
};

export default savedSearchDelete;
