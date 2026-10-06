import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient } from "../lib/client.ts";

interface Input {
  name: string;
  is_shared?: boolean;
}

const createExclusionList: ActionDefinition<Input> = {
  key: "create-exclusion-list",
  type: "perform",
  resource: "exclusion-list",
  title: "Create Exclusion List",
  description: "Create an Intellimatch exclusion list. The name must be unique per user.",
  idempotent: false,
  params: [{ "key": "name", "label": "Name", "type": "string", "required": true }, {
    "key": "is_shared",
    "label": "Share with team",
    "type": "boolean",
  }],
  output: [
    { "key": "id", "type": "number", "label": "List ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "is_shared", "type": "boolean", "label": "Shared with team" },
    { "key": "is_owner", "type": "boolean", "label": "Caller owns the list" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("POST", "/api/intellimatch/exclusion-lists", {
      body: compact({ name: input.name, is_shared: input.is_shared }),
    });
  },
};

export default createExclusionList;
