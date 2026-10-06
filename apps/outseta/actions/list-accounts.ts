import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  q?: string;
  segmentUid?: string;
  accountStage?: string | number;
}

/** `GET /api/v1/crm/accounts` — List accounts (the customers being billed), optionally by name search, segment or billing stage. */
const listAccounts: ActionDefinition<Input> = {
  key: "list-accounts",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    "List accounts (the customers being billed), optionally by name search, segment or billing stage.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Partial match on account name, or an exact account Uid.",
    },
    {
      key: "segmentUid",
      label: "Segment Uid",
      type: "string",
      hint: "Only accounts in this segment.",
    },
    {
      key: "accountStage",
      label: "Billing stage",
      type: "select",
      hint: "Accounts are moved between stages automatically by subscription activity.",
      options: [
        {
          value: 2,
          label: "Trialing",
        },
        {
          value: 3,
          label: "Subscribing",
        },
        {
          value: 4,
          label: "Canceling",
        },
        {
          value: 5,
          label: "Expired",
        },
        {
          value: 6,
          label: "Trial expired",
        },
      ],
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/accounts`, {
      method: "GET",
      query: {
        ...pageQuery(input),
        q: input.q,
        segmentUid: input.segmentUid,
        AccountStage: input.accountStage,
      },
    });
  },
};

export default listAccounts;
