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

const postcardList: ActionDefinition<Input> = {
  key: "postcard-list",
  type: "search",
  resource: "postcard",
  title: "List Postcards",
  description:
    "List postcards sent from this account, with status, mail type, send date and metadata filters and cursor paging.",
  params: [
    ...paginationParams(10),
    ...filterParams,
    ...mailListParams,
    {
      key: "size",
      label: "Size",
      type: "multiselect",
      advanced: true,
      options: [{ value: "4x6", label: "4x6" }, { value: "6x9", label: "6x9" }, {
        value: "6x11",
        label: "6x11",
      }],
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list("/postcards", {
      ...mailListQuery(input),
      ...{ size: toArray(input.size) },
    }, {
      includeTotal: input.includeTotal,
    });
  },
};

export default postcardList;
