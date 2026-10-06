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
}

/** `GET /api/v1/crm/people` — List the people in the account one page at a time, optionally matching a name or email. */
const listPeople: ActionDefinition<Input> = {
  key: "list-people",
  type: "search",
  resource: "person",
  title: "List People",
  description:
    "List the people in the account one page at a time, optionally matching a name or email.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches first name, last name or email address.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/people`, {
      method: "GET",
      query: { ...pageQuery(input), q: input.q },
    });
  },
};

export default listPeople;
