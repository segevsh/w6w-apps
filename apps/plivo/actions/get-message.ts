import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  messageUuid: string;
}

/** `GET /v1/Account/{auth_id}/Message/{message_uuid}/` — one message detail record. */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Retrieve the detail record (state, error code, units, charges) of one message.",
  params: [
    {
      key: "messageUuid",
      label: "Message UUID",
      type: "string",
      required: true,
      hint: "The `message_uuid` returned when the message was sent.",
    },
  ],

  output: [
    { key: "message_uuid", type: "string", label: "Message UUID" },
    { key: "message_state", type: "string", label: "State" },
    { key: "message_direction", type: "string", label: "Direction" },
    { key: "message_type", type: "string", label: "Type" },
    { key: "from_number", type: "string", label: "From" },
    { key: "to_number", type: "string", label: "To" },
    { key: "units", type: "number", label: "Units" },
    { key: "total_amount", type: "string", label: "Total amount (USD)" },
    { key: "error_code", type: "string", label: "Error code" },
    { key: "message_time", type: "string", label: "Message time" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Message/${segment("messageUuid", input.messageUuid)}/`);
  },
};

export default getMessage;
