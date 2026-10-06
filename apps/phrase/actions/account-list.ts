import type { ActionDefinition } from "@w6w/types";
import { PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/accounts` — list the Phrase accounts (organizations) the token can see; the account id is needed to create projects.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    "List the Phrase accounts (organizations) the token can see; the account id is needed to create projects.",
  params: [
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/accounts`, { page: input.page, per_page: input.perPage });
  },
};

export default accountList;
