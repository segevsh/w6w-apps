import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  groupUuid: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group and Participants",
  description:
    "Get a WhatsApp group's details and participant list (GET /whatsapp/group/{group-uuid}).",
  params: [
    {
      key: "groupUuid",
      label: "Group UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Group with `participants` (phone_number, wa_is_admin, contact …)",
    },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/group/${seg(input.groupUuid)}`);
  },
};

export default groupGet;
