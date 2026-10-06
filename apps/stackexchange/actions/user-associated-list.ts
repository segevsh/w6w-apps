import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  idList,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import { filterParam, idsParam, LIST_OUTPUT, pageParam, pageSizeParam } from "../lib/params.ts";

interface Input extends CommonInput {
  accountIds: string | string[];
}

const userAssociatedList: ActionDefinition<Input> = {
  key: "user-associated-list",
  type: "read",
  resource: "user",
  title: "List Associated Accounts",
  description:
    "A network user's accounts on every site, by network account ID. Network-level: takes no site.",
  params: [
    idsParam(
      "accountIds",
      "Account IDs",
      "One or more network account IDs (`account_id` on a user object), comma- or semicolon-separated.",
    ),
    pageParam,
    pageSizeParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(
      `/users/${idList(input.accountIds)}/associated`,
      {
        ...commonQuery(input, false),
      },
    );
    return wrapperResult(body);
  },
};

export default userAssociatedList;
