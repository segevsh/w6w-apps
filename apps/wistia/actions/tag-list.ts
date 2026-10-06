import type { ActionDefinition } from "@w6w/types";
import { pageOf, WistiaClient } from "../lib/client.ts";
import {
  type ListInput,
  listQuery,
  pageOutput,
  paginationParams,
  sortByParam,
  sortDirectionParam,
} from "../lib/params.ts";

const tagList: ActionDefinition<ListInput> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the tags in the account with how many media carry each.",
  params: [
    sortByParam([
      ["name", "Name"],
      ["created", "Created"],
      ["updated", "Updated"],
      ["taggingsCount", "Times used"],
      ["id", "ID"],
    ]),
    sortDirectionParam,
    ...paginationParams(100),
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    return pageOf(
      await new WistiaClient(ctx).json<unknown[]>("/tags", { query: listQuery(input) }),
    );
  },
};

export default tagList;
