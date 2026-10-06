import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

const groupsList: ActionDefinition<Input> = {
  key: "groups-list",
  type: "read",
  resource: "group",
  title: "List WhatsApp Groups",
  description:
    "List the WhatsApp groups a connected number is in (GET /whatsapp/groups/{phone-number}). A fresh " +
    "connection can take 5 to 30 minutes to show its groups.",
  params: [
    {
      key: "phoneNumber",
      label: "Connected number",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Groups: uuid (WAG…), wa_group_name, size, owner_contact …",
    },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/groups/${seg(input.phoneNumber)}`);
  },
};

export default groupsList;
