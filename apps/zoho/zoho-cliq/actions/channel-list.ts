import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoCliqClient } from "../lib/client.ts";
import { limitParam, nextTokenParam } from "../lib/params.ts";

interface Input {
  name?: string;
  status?: string;
  level?: string;
  joined?: boolean;
  pinned?: boolean;
  limit?: number;
  nextToken?: string;
}

interface Output {
  channels: Array<Record<string, unknown>>;
  nextToken?: string;
}

/**
 * `GET /api/v2/channels` — scope `ZohoCliq.Channels.READ`. Response is
 * `{ channels: [...], next_token, sync_token }`; `limit` maxes at 100.
 */
const channelList: ActionDefinition<Input, Output> = {
  key: "channel-list",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List channels in the organization, filtered by name, status, level or membership.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Name of the channel to retrieve." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "created", label: "Created" },
        { value: "pending", label: "Pending approval" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [
        { value: "organization", label: "Organization" },
        { value: "team", label: "Team" },
        { value: "private", label: "Private" },
        { value: "external", label: "External" },
      ],
    },
    {
      key: "joined",
      label: "Joined only",
      type: "boolean",
      hint: "true: only channels you have joined; false: only those you have not.",
    },
    { key: "pinned", label: "Pinned only", type: "boolean" },
    limitParam(100),
    nextTokenParam,
  ],
  output: [
    { key: "channels", type: "array", label: "Channels" },
    { key: "nextToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { channels?: Array<Record<string, unknown>>; next_token?: string }
    >("/channels", {
      query: compact({
        name: input.name,
        status: input.status,
        level: input.level,
        joined: input.joined,
        pinned: input.pinned,
        limit: input.limit,
        next_token: input.nextToken,
      }),
    });
    return { channels: body?.channels ?? [], nextToken: body?.next_token };
  },
};

export default channelList;
