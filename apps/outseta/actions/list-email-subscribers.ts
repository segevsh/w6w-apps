import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  pathId,
} from "../lib/client.ts";

interface Input extends PageInput {
  emailListUid: string;
  q?: string;
}

/** `GET /api/v1/email/lists/{emailListUid}/subscriptions` — List the subscribers of an email list, optionally matching a name or email. */
const listEmailSubscribers: ActionDefinition<Input> = {
  key: "list-email-subscribers",
  type: "search",
  resource: "email-list",
  title: "List Email List Subscribers",
  description: "List the subscribers of an email list, optionally matching a name or email.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "emailListUid",
      label: "Email list Uid",
      type: "string",
      hint: "The email list's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches first name, last name or email address.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(
      `/email/lists/${pathId(input.emailListUid)}/subscriptions`,
      { method: "GET", query: { ...pageQuery(input), q: input.q } },
    );
  },
};

export default listEmailSubscribers;
