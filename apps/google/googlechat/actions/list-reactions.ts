import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, messageName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `spaces.messages.reactions.list` — GET /v1/{parent=spaces/*&#47;messages/*}/reactions
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages.reactions/list
 *
 * User authentication only, like the rest of the reaction surface.
 */
const listReactions: ActionDefinition<Input> = {
  key: "list-reactions",
  type: "read",
  resource: "reaction",
  title: "List Reactions",
  description:
    "List the reactions on a message, and who left them. Returns one page; pass `pageToken` for the next.",
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
      key: "message",
      label: "Message",
      type: "string",
      required: true,
      hint:
        "The message id, or the full resource name `spaces/{space}/messages/{message}` — a full name here overrides Space.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'Filters on `emoji.unicode`, `emoji.custom_emoji.uid` and `user.name`. e.g. `emoji.unicode = "👍"`.',
      placeholder: 'emoji.unicode = "👍"',
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Google's default is 25; the maximum is 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "reactions", type: "array", label: "Reactions" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${messageName(input.space, input.message)}/reactions`, {
      query: {
        filter: input.filter,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listReactions;
