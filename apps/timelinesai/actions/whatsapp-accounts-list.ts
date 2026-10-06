import type { ActionDefinition } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

type Input = Record<string, never>;

const whatsappAccountsList: ActionDefinition<Input> = {
  key: "whatsapp-accounts-list",
  type: "read",
  resource: "workspace",
  title: "List WhatsApp Accounts",
  description: "The WhatsApp numbers connected to the workspace (GET /whatsapp_accounts).",
  params: [],
  output: [
    {
      key: "data",
      type: "object",
      label:
        "whatsapp_accounts[]: id (wid), phone, status, connected_on, owner_name, owner_email, account_name",
    },
  ],

  execute(_input, ctx) {
    return new TimelinesClient(ctx).get("/whatsapp_accounts");
  },
};

export default whatsappAccountsList;
