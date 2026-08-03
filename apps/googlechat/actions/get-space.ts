import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName } from "../lib/client.ts";

interface Input {
  space: string;
}

/**
 * `spaces.get` — GET /v1/{name=spaces/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/get
 *
 * `useAdminAccess` is deliberately not exposed: it requires a `chat.admin.*`
 * scope this app never asks for, so offering the flag would only produce 403s.
 */
const getSpace: ActionDefinition<Input> = {
  key: "get-space",
  type: "read",
  resource: "space",
  title: "Get Space",
  description: "Fetch a single space by id, including its display name, type and settings.",
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint:
        "The space id, or the full resource name `spaces/{space}`. The id is the last segment of the space URL.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "spaceType", type: "string", label: "Space type" },
    { key: "spaceUri", type: "string", label: "Link to the space" },
    { key: "spaceDetails", type: "object", label: "Description and guidelines" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${spaceName(input.space)}`);
  },
};

export default getSpace;
