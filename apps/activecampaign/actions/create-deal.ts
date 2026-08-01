import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient, compact } from "../lib/client.ts";

interface Input {
  title: string;
  contact?: string;
  account?: string;
  value: number;
  currency: string;
  group?: string;
  stage?: string;
  owner?: string;
  description?: string;
}

const createDeal: ActionDefinition<Input> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description:
    "Create a new deal. One of Contact ID / Account ID is required, and one of Pipeline ID / Stage ID is required.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "contact",
      label: "Contact ID",
      type: "string",
      hint: "Required if Account ID is not set.",
    },
    {
      key: "account",
      label: "Account ID",
      type: "string",
      hint: "Required if Contact ID is not set.",
    },
    { key: "value", label: "Value (cents)", type: "number", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      placeholder: "usd",
      hint: "3-character ISO code, lowercase.",
    },
    {
      key: "group",
      label: "Pipeline (Group) ID",
      type: "string",
      hint: "Required if Stage ID is not set.",
    },
    {
      key: "stage",
      label: "Stage ID",
      type: "string",
      hint: "Required if Pipeline ID is not set.",
    },
    {
      key: "owner",
      label: "Owner (User) ID",
      type: "string",
      hint: "Required unless your account has deal auto-assignment enabled.",
    },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "deal", type: "object", label: "Deal" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/deals", {
      method: "POST",
      body: {
        deal: compact({
          title: input.title,
          contact: input.contact,
          account: input.account,
          value: input.value,
          currency: input.currency,
          group: input.group,
          stage: input.stage,
          owner: input.owner,
          description: input.description,
        }),
      },
    });
  },
};

export default createDeal;
