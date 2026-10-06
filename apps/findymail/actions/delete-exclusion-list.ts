import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const deleteExclusionList: ActionDefinition<Input> = {
  key: "delete-exclusion-list",
  type: "perform",
  resource: "exclusion-list",
  title: "Delete Exclusion List",
  description: "Delete an exclusion list and all its domains. Only the owner may delete it.",
  idempotent: true,
  params: [{ "key": "id", "label": "Exclusion list ID", "type": "number", "required": true }],
  output: [{ "key": "success", "type": "boolean", "label": "Success" }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request(
      "DELETE",
      `/api/intellimatch/exclusion-lists/${seg(input.id)}`,
    );
  },
};

export default deleteExclusionList;
