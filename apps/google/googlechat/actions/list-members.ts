import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName } from "../lib/client.ts";

interface Input {
  space: string;
  filter?: string;
  showGroups?: boolean;
  showInvited?: boolean;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `spaces.members.list` — GET /v1/{parent=spaces/*}/members
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.members/list
 *
 * `showInvited` is a user-auth-only flag — Google states it "currently requires
 * user authentication" — which is exactly the posture this app ships, so it is
 * exposed. `useAdminAccess` is not: it needs a `chat.admin.*` scope this app
 * never requests.
 */
const listMembers: ActionDefinition<Input> = {
  key: "list-members",
  type: "read",
  resource: "membership",
  title: "List Members",
  description: "List the memberships of a space. Returns one page; pass `pageToken` for the next.",
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'Filters on `role` (`ROLE_MEMBER`, `ROLE_MANAGER`) and `member.type` (`HUMAN`, `BOT`). e.g. `role = "ROLE_MANAGER"`.',
      placeholder: 'member.type = "HUMAN"',
    },
    {
      key: "showGroups",
      label: "Include Google Groups",
      type: "boolean",
      hint: "Google's default is false.",
    },
    {
      key: "showInvited",
      label: "Include invited members",
      type: "boolean",
      hint: "Google's default is false. Requires user authentication, which is what this app uses.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Google's default is 100; the maximum is 1000.",
      validation: { integer: true, min: 1, max: 1000 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "memberships", type: "array", label: "Memberships" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${spaceName(input.space)}/members`, {
      query: {
        filter: input.filter,
        showGroups: input.showGroups,
        showInvited: input.showInvited,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listMembers;
