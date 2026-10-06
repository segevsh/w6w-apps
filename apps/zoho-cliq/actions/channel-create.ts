import type { ActionDefinition } from "@w6w/types";
import { compact, toList, unwrapData, ZohoCliqClient } from "../lib/client.ts";

interface Input {
  name: string;
  level: string;
  description?: string;
  inviteOnly?: boolean;
  teamIds?: string | string[];
  userIds?: string | string[];
  emailIds?: string | string[];
}

interface Output {
  channel: Record<string, unknown>;
}

/**
 * `POST /api/v2/channels` — scope `ZohoCliq.Channels.CREATE`. `level` is
 * mandatory and `team_ids` is mandatory when `level=team`. An organization-
 * level channel stays `pending` until an org admin approves it.
 */
const channelCreate: ActionDefinition<Input, Output> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a channel and optionally add its first members.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "level",
      label: "Level",
      type: "select",
      required: true,
      options: [
        { value: "organization", label: "Organization" },
        { value: "team", label: "Team" },
        { value: "private", label: "Private" },
        { value: "external", label: "External" },
      ],
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "inviteOnly",
      label: "Invite only",
      type: "boolean",
      hint: "Applies to organization- and team-level channels only.",
    },
    {
      key: "teamIds",
      label: "Team IDs",
      type: "string",
      hint: "Comma-separated team ids. Required when level is Team.",
    },
    { key: "userIds", label: "Member user IDs", type: "string", hint: "Comma-separated." },
    { key: "emailIds", label: "Member emails", type: "string", hint: "Comma-separated." },
  ],
  output: [{ key: "channel", type: "object", label: "Created channel" }],

  async execute(input, ctx) {
    const teamIds = toList(input.teamIds);
    if (input.level === "team" && teamIds.length === 0) {
      throw new Error("`teamIds` is required when the channel level is team.");
    }
    const userIds = toList(input.userIds);
    const emailIds = toList(input.emailIds);
    const body = await new ZohoCliqClient(ctx).request("/channels", {
      method: "POST",
      body: compact({
        name: input.name,
        level: input.level,
        description: input.description,
        invite_only: input.inviteOnly,
        team_ids: teamIds.length ? teamIds : undefined,
        user_ids: userIds.length ? userIds : undefined,
        email_ids: emailIds.length ? emailIds : undefined,
      }),
    });
    return { channel: unwrapData(body) };
  },
};

export default channelCreate;
