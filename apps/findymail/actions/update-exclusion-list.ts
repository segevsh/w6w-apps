import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
  name: string;
  is_shared?: boolean;
}

const updateExclusionList: ActionDefinition<Input> = {
  key: "update-exclusion-list",
  type: "perform",
  resource: "exclusion-list",
  title: "Update Exclusion List",
  description:
    "Rename an exclusion list and/or change its sharing. Only the owner may update it; sharing needs a team.",
  idempotent: true,
  params: [{ "key": "id", "label": "Exclusion list ID", "type": "number", "required": true }, {
    "key": "name",
    "label": "Name",
    "type": "string",
    "required": true,
  }, { "key": "is_shared", "label": "Share with team", "type": "boolean" }],
  output: [{ "key": "success", "type": "boolean", "label": "Success" }, {
    "key": "list",
    "type": "object",
    "label": "The updated list",
  }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request(
      "PUT",
      `/api/intellimatch/exclusion-lists/${seg(input.id)}`,
      { body: compact({ name: input.name, is_shared: input.is_shared }) },
    );
  },
};

export default updateExclusionList;
