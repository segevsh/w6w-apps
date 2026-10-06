import type { ActionDefinition } from "@w6w/types";
import { compact, seg, UscreenClient } from "../lib/client.ts";

interface Input {
  groupId: number;
  email: string;
  name: string;
  role: string;
  skipAutomations?: boolean;
}

const groupMemberAdd: ActionDefinition<Input> = {
  key: "group-member-add",
  type: "perform",
  resource: "group",
  title: "Add Group Member",
  description: "Add a member to a group.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
    { "key": "email", "label": "Email", "type": "string", "required": true },
    { "key": "name", "label": "Name", "type": "string", "required": true },
    {
      "key": "role",
      "label": "Role",
      "type": "select",
      "required": true,
      "options": [{ "value": "member", "label": "Member" }, {
        "value": "manager",
        "label": "Manager",
      }],
      "default": "member",
    },
    {
      "key": "skipAutomations",
      "label": "Skip automations",
      "type": "boolean",
      "hint": "True to skip automation enrollment such as lead_created.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/groups/${seg(input.groupId)}/members`,
      {
        body: compact({
          "email": input.email,
          "name": input.name,
          "role": input.role,
          "skip_automations": input.skipAutomations,
        }),
      },
    )) ?? {};
  },
};

export default groupMemberAdd;
