import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/add`
 *
 * Create a channel in a workspace.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  workspaceId: number;
  name: string;
  tempId?: number;
  userIds?: string;
  color?: number;
  public?: boolean;
  description?: string;
  defaultGroups?: string;
  defaultRecipients?: string;
  isFavorited?: boolean;
  icon?: number;
}

const channelCreate: ActionDefinition<Input> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a channel in a workspace.",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    { key: "name", label: "Name", type: "string", required: true, hint: "1 to 80 characters." },
    { key: "tempId", label: "Temporary ID", type: "number", hint: "Negative temporary id." },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated ids of the participants.",
    },
    { key: "color", label: "Color", type: "number", hint: "Color id, see Twist's Colors table." },
    { key: "public", label: "Public", type: "boolean", hint: "Make the channel public." },
    { key: "description", label: "Description", type: "string" },
    {
      key: "defaultGroups",
      label: "Default groups",
      type: "string",
      hint: "Comma-separated group ids notified by default.",
    },
    {
      key: "defaultRecipients",
      label: "Default recipients",
      type: "string",
      hint: "Comma-separated user ids notified by default.",
    },
    { key: "isFavorited", label: "Favorited", type: "boolean" },
    { key: "icon", label: "Icon", type: "number", hint: "Icon id, see Twist's Icons table." },
  ],
  output: [
    { key: "id", type: "number", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/channels/add",
      params: {
        "workspace_id": input.workspaceId,
        "name": input.name,
        "temp_id": input.tempId,
        "user_ids": idList(input.userIds),
        "color": input.color,
        "public": input.public,
        "description": input.description,
        "default_groups": idList(input.defaultGroups),
        "default_recipients": idList(input.defaultRecipients),
        "is_favorited": input.isFavorited,
        "icon": input.icon,
      },
    });
  },
};

export default channelCreate;
