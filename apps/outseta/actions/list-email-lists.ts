import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
}

/** `GET /api/v1/email/lists` — List the account's email lists with their subscriber counts. */
const listEmailLists: ActionDefinition<Input> = {
  key: "list-email-lists",
  type: "search",
  resource: "email-list",
  title: "List Email Lists",
  description: "List the account's email lists with their subscriber counts.",
  params: [
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/email/lists`, {
      method: "GET",
      query: { ...pageQuery(input) },
    });
  },
};

export default listEmailLists;
