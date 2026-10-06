import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/update`
 *
 * Update a channel. Twist requires the name on every update.
 */
interface Input {
  channelId: number;
  name: string;
  color?: number;
  public?: boolean;
  description?: string;
  defaultGroups?: string;
  defaultRecipients?: string;
  isFavorited?: boolean;
  icon?: number;
}

const channelUpdate: ActionDefinition<Input> = {
  key: "channel-update",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Update a channel. Twist requires the name on every update.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true, hint: "1 to 80 characters." },
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
      path: "/channels/update",
      params: {
        "id": input.channelId,
        "name": input.name,
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

export default channelUpdate;
