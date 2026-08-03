import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient } from "../lib/client.ts";

interface Input {
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `spaces.list` — GET /v1/spaces
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/list
 *
 * Lists spaces the *caller* is a member of. It does not list every space in the
 * Workspace — that needs `spaces.search` with admin access, which this app does
 * not offer.
 */
const listSpaces: ActionDefinition<Input> = {
  key: "list-spaces",
  type: "read",
  resource: "space",
  title: "List Spaces",
  description:
    "List the spaces the authenticated user is a member of. Returns one page; pass `pageToken` for the next.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'Filters on `space_type` only. e.g. `space_type = "SPACE"` or `space_type = "SPACE" OR space_type = "GROUP_CHAT"`.',
      placeholder: 'space_type = "SPACE"',
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
    { key: "spaces", type: "array", label: "Spaces" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/spaces`, {
      query: {
        filter: input.filter,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listSpaces;
