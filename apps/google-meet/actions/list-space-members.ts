import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.spaces.members.list` — GET `v2/{+parent}/members`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * Members are the users configured with a role in the space (currently only
 * `COHOST`) — co-host configuration, not the live participant roster, which
 * lives under `conferenceRecords`.
 */
const listSpaceMembers: ActionDefinition<Input> = {
  key: "list-space-members",
  type: "read",
  resource: "member",
  title: "List Space Members",
  description: "List the configured members (co-hosts) of a space. Returns one page.",
  params: [
    {
      key: "parent",
      label: "Space",
      type: "string",
      required: true,
      hint: "`spaces/{space}`.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "At most 250 when unset or 0; values above 500 are coerced to 500.",
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/members`, {
      query: {
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listSpaceMembers;
