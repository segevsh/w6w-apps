import type { ActionDefinition } from "@w6w/types";
import { LobClient } from "../lib/client.ts";
import {
  filterParams,
  listOutput,
  type MailListInput,
  mailListParams,
  mailListQuery,
  paginationParams,
  toArray,
} from "../lib/params.ts";

interface Input extends MailListInput {
  size?: string[] | string;
}

const selfMailerList: ActionDefinition<Input> = {
  key: "self-mailer-list",
  type: "search",
  resource: "self-mailer",
  title: "List Self Mailers",
  description:
    "List self mailers sent from this account, with status, mail type, send date and metadata filters and cursor paging.",
  params: [
    ...paginationParams(10),
    ...filterParams,
    ...mailListParams,
    {
      key: "size",
      label: "Size",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "6x18_bifold", label: "6x18 bifold" },
        { value: "11x9_bifold", label: "11x9 bifold" },
        { value: "12x9_bifold", label: "12x9 bifold" },
        { value: "17.75x9_trifold", label: "17.75x9 trifold" },
      ],
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/self_mailers", {
      ...mailListQuery(input),
      ...{ size: toArray(input.size) },
    }, {
      includeTotal: input.includeTotal,
    });
  },
};

export default selfMailerList;
