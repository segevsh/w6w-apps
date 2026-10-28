import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, userName } from "../lib/client.ts";

interface Input {
  user: string;
}

/**
 * `spaces.findDirectMessage` — GET /v1/spaces:findDirectMessage
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/findDirectMessage
 *
 * Resolves "the DM between me and this person" to a space resource name, which
 * is the missing first step for every "send a direct message" workflow — Create
 * Message needs a space, and a DM's space id is not otherwise discoverable.
 *
 * `name` is a *query* parameter here, not a path segment, despite naming a
 * resource. Google returns 404 when no DM exists between the two users.
 */
const findDirectMessage: ActionDefinition<Input> = {
  key: "find-direct-message",
  type: "read",
  resource: "space",
  title: "Find Direct Message",
  description:
    "Find the existing direct-message space between the authenticated user and another user. Returns 404 if they have never exchanged a DM — use Set Up Space with type DIRECT_MESSAGE to create one.",
  params: [
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      hint:
        "A user id or the full `users/{user}` resource name. `{user}` is the People API person id or the Directory API user id.",
      placeholder: "users/123456789",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name of the DM space" },
    { key: "spaceType", type: "string", label: "Space type" },
    { key: "singleUserBotDm", type: "boolean", label: "Is a 1:1 DM with a Chat app" },
    { key: "spaceUri", type: "string", label: "Link to the space" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/spaces:findDirectMessage`, {
      query: { name: userName(input.user) },
    });
  },
};

export default findDirectMessage;
