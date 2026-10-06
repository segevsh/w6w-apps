import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";
import {
  filterParams,
  listOutput,
  type MailListInput,
  mailListParams,
  mailListQuery,
  paginationParams,
} from "../lib/params.ts";

interface Input extends MailListInput {
  color?: boolean;
}

const letterList: ActionDefinition<Input> = {
  key: "letter-list",
  type: "search",
  resource: "letter",
  title: "List Letters",
  description:
    "List letters sent from this account, with status, mail type, send date and metadata filters and cursor paging.",
  params: [
    ...paginationParams(10),
    ...filterParams,
    ...mailListParams,
    {
      key: "color",
      label: "Color",
      type: "boolean",
      advanced: true,
      hint: "Only color (true) or only black and white (false).",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/letters", {
      ...mailListQuery(input),
      ...compact({ color: input.color }),
    }, {
      includeTotal: input.includeTotal,
    });
  },
};

export default letterList;
