import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { memberIncludeParams } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  userId: string;
  include?: string[] | string;
}

const workspaceMemberAdd: ActionDefinition<Input> = {
  key: "workspace-member-add",
  type: "perform",
  resource: "workspace",
  title: "Add Workspace Member",
  description:
    "Add a member to a workspace (idempotent). The caller must both participate in the workspace AND belong to the company that owns it; anyone else gets a 404.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "User id of the member to add.",
    },
    ...memberIncludeParams,
  ],
  output: [
    { key: "user_id", type: "string", label: "User id" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "role", type: "string", label: "Role" },
    { key: "status", type: "string", label: "Status" },
    { key: "added_at", type: "string", label: "Added at" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
    { key: "sms_consent_confirmed", type: "boolean", label: "Sms consent confirmed" },
    { key: "user", type: "object", label: "User" },
    { key: "contact", type: "object", label: "Contact" },
  ],

  async execute(input, ctx) {
    const body = compact({
      include: toList(input.include),
    });
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/workspaces/${encodeId(input.workspaceId)}/members/${encodeId(input.userId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default workspaceMemberAdd;
