import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, jsonValue } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  name: string;
  type: "code" | "noCode";
  key?: string;
  description?: string;
  noCodeConfig?: unknown;
}

/** `POST /api/v1/management/action-classes` */
const actionClassCreate: ActionDefinition<Input> = {
  key: "action-class-create",
  type: "perform",
  resource: "action-class",
  title: "Create Action Class",
  description: "Create a code or no-code action class.",
  idempotent: false,
  params: [
    {
      "key": "workspaceId",
      "label": "Workspace ID",
      "type": "string",
      "required": true,
      "hint": "The workspace the action class is created in.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "code",
          "label": "code",
        },
        {
          "value": "noCode",
          "label": "noCode",
        },
      ],
    },
    {
      "key": "key",
      "label": "Key",
      "type": "string",
      "hint": "Required when type is `code`: the unique identifier your code fires.",
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "noCodeConfig",
      "label": "No-code config",
      "type": "json",
      "hint":
        'Required when type is `noCode`: {"type":"click|pageView|exitIntent|fiftyPercentScroll","urlFilters":[{"rule":"contains","value":"/pricing"}],"elementSelector":{"cssSelector":"#buy"}}.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("POST", "/management/action-classes", {
      body: compact({
        workspaceId: input.workspaceId,
        name: input.name,
        type: input.type,
        key: input.key,
        description: input.description,
        noCodeConfig: jsonValue(input.noCodeConfig),
      }),
    });
    return { data: res.data ?? null };
  },
};

export default actionClassCreate;
