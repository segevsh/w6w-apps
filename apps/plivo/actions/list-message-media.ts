import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  messageUuid: string;
}

/** `GET /v1/Account/{auth_id}/Message/{message_uuid}/Media/` — media of an MMS. */
const listMessageMedia: ActionDefinition<Input> = {
  key: "list-message-media",
  type: "read",
  resource: "message",
  title: "List MMS Media",
  description: "List the media files attached to an MMS message.",
  params: [
    {
      key: "messageUuid",
      label: "Message UUID",
      type: "string",
      required: true,
      hint: "UUID of an MMS message.",
    },
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    { key: "objects", type: "array", label: "Media files" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(
      `Message/${segment("messageUuid", input.messageUuid)}/Media/`,
    );
  },
};

export default listMessageMedia;
