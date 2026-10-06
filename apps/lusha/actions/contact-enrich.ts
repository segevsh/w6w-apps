import type { ActionDefinition } from "@w6w/types";
import { compact, LushaClient, strList } from "../lib/client.ts";

interface Input {
  ids: string | string[];
  reveal?: string | string[];
  waterfallEnabled?: boolean;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-enrich",
  type: "perform",
  resource: "contact",
  title: "Enrich Contacts",
  description:
    "Reveal emails and/or phones for contacts already found by Contact Search (up to 100 ids). Spends credits; may return a `job` to poll with Get Contact Enrich Job.",
  idempotent: false,
  params: [
    {
      key: "ids",
      label: "Contact IDs",
      type: "string",
      required: true,
      hint: "Ids from Search Contacts, comma separated or an array (max 100).",
    },
    {
      key: "reveal",
      label: "Reveal",
      type: "string",
      hint: "emails, phones, or both. Omit for the account default.",
    },
    {
      key: "waterfallEnabled",
      label: "Allow waterfall providers",
      type: "boolean",
      hint: "Let the call fall through to your enabled third-party providers.",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Enriched contacts" },
    {
      key: "job",
      type: "object",
      label: "Present when an async provider is still working: poll its id",
    },
    { key: "status", type: "string", label: "Waterfall outcome, when the waterfall ran" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/enrich`, {
      body: compact({
        ids: strList(input.ids),
        reveal: strList(input.reveal),
        waterfallEnabled: input.waterfallEnabled,
        tableId: input.tableId,
      }),
    });
  },
};

export default action;
