import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const getExclusionList: ActionDefinition<Input> = {
  key: "get-exclusion-list",
  type: "read",
  resource: "exclusion-list",
  title: "Get Exclusion List",
  description:
    "Get one exclusion list's details (without its domains — use List Excluded Domains for those).",
  params: [{ "key": "id", "label": "Exclusion list ID", "type": "number", "required": true }],
  output: [
    { "key": "id", "type": "number", "label": "List ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "is_shared", "type": "boolean", "label": "Shared with team" },
    { "key": "is_owner", "type": "boolean", "label": "Caller owns the list" },
    { "key": "user_id", "type": "number", "label": "Owner user ID" },
    { "key": "owner_name", "type": "string", "label": "Owner name" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request(
      "GET",
      `/api/intellimatch/exclusion-lists/${seg(input.id)}`,
    );
  },
};

export default getExclusionList;
