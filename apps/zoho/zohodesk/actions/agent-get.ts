import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

interface Input extends DeskGetInput {
  include?: string;
}

const agentGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Get a single agent by id.",
  params: [
    recordId,
    orgId,
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "profile", label: "Profile" },
        { value: "role", label: "Role" },
        { value: "associatedDepartments", label: "Associated Departments" },
        { value: "associatedChatDepartments", label: "Associated Chat Departments" },
        { value: "verifiedEmails", label: "Verified Emails" },
      ],
      config: { valueFormat: "csv" },
      hint: "Comma-separated: profile, role, associatedDepartments, associatedChatDepartments, " +
        "verifiedEmails.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Agent ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/agents", input, { include: input.include });
  },
};

export default agentGet;
