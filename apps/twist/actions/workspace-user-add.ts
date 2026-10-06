import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v4/workspace_users/add`
 *
 * Invite a person to a workspace by email.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  workspaceId: number;
  email: string;
  name?: string;
  userType?: string;
  channelIds?: string;
}

const workspaceUserAdd: ActionDefinition<Input> = {
  key: "workspace-user-add",
  type: "perform",
  resource: "workspace-user",
  title: "Add User to Workspace",
  description: "Invite a person to a workspace by email.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "userType",
      label: "User type",
      type: "select",
      options: [{ value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }, {
        value: "GUEST",
        label: "GUEST",
      }],
    },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated channel ids to add the user to.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "user_type", type: "string", label: "User type" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/workspace_users/add",
      version: 4,
      params: {
        "id": input.workspaceId,
        "email": input.email,
        "name": input.name,
        "user_type": input.userType,
        "channel_ids": idList(input.channelIds),
      },
    });
  },
};

export default workspaceUserAdd;
