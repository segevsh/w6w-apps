import type { ActionDefinition } from "@w6w/types";
import { LobClient, stripBankSecrets } from "../lib/client.ts";
import {
  filterParams,
  listOutput,
  type PageInput,
  pageQuery,
  paginationParams,
} from "../lib/params.ts";

interface Input extends PageInput {}

const bankAccountList: ActionDefinition<Input> = {
  key: "bank-account-list",
  type: "search",
  resource: "bank-account",
  title: "List Bank Accounts",
  description:
    "List bank accounts that checks can be drawn on, with cursor paging. The full account number is removed from the result (Lob echoes it back).",
  params: [...paginationParams(10), ...filterParams],
  output: listOutput,

  async execute(input, ctx) {
    const page = await new LobClient(ctx).list("/bank_accounts", pageQuery(input), {
      includeTotal: input.includeTotal,
    });
    return { ...page, items: page.items.map(stripBankSecrets) };
  },
};

export default bankAccountList;
