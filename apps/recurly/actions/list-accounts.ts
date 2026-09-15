import type { ActionDefinition } from "@w6w/types";
import { PAGE_OUTPUT, PAGE_PARAMS, RecurlyClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  order?: "asc" | "desc";
  ids?: string;
  next?: string;
  sort?: "created_at" | "updated_at";
  beginTime?: string;
  endTime?: string;
  email?: string;
  subscriber?: boolean;
  pastDue?: boolean;
}

/**
 * `GET /accounts` — list the site's accounts.
 *
 * `pastDue` maps onto the documented `past_due` filter, which only ever takes
 * the literal `true` (the OpenAPI document types it `TrueEnum`) — there is no
 * `past_due=false` to ask for the opposite.
 */
const listAccounts: ActionDefinition<Input> = {
  key: "list-accounts",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    "List a site's accounts, optionally filtered by email, subscriber or past-due status.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    {
      key: "beginTime",
      label: "Begin time",
      type: "datetime",
      hint: "ISO 8601. Requires Sort by.",
    },
    { key: "endTime", label: "End time", type: "datetime", hint: "ISO 8601. Requires Sort by." },
    { key: "email", label: "Email", type: "string", hint: "Exact match." },
    {
      key: "subscriber",
      label: "Has a subscription",
      type: "boolean",
      hint: "Filters for accounts with (true) or without (false) a subscription in the active, " +
        "canceled or future state.",
    },
    {
      key: "pastDue",
      label: "Has a past-due invoice",
      type: "boolean",
      hint: 'Only `true` is meaningful — Recurly has no "not past due" filter.',
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/accounts", {
      query: input.next ? undefined : {
        limit: input.limit,
        order: input.order,
        ids: input.ids,
        sort: input.sort,
        begin_time: input.beginTime,
        end_time: input.endTime,
        email: input.email,
        subscriber: input.subscriber,
        past_due: input.pastDue ? true : undefined,
      },
    });
  },
};

export default listAccounts;
