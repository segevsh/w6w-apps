import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `DELETE /api/client/v2/lists/{id}` — Delete List. */
interface Input {
  id: string;
}

const listDelete: ActionDefinition<Input> = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  title: "Delete List",
  description: "Delete a list. Contacts and companies in it are not deleted.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
      hint: "List ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "DELETE",
      `/lists/${segment(input.id, "List ID")}`,
    );
  },
};

export default listDelete;
