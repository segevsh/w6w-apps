import type { ActionDefinition } from "@w6w/types";
import { pageOf, toList, WistiaClient } from "../lib/client.ts";
import {
  type ListInput,
  listQuery,
  pageOutput,
  paginationParams,
  sortByParam,
  sortDirectionParam,
} from "../lib/params.ts";

interface Input extends ListInput {
  hashedIds?: string[] | string;
}

const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description:
    "List folders (previously called projects). Personal My Library folders are not included.",
  params: [
    {
      key: "hashedIds",
      label: "Hashed IDs",
      type: "string",
      hint: "Comma-separated hashed IDs, for a batch fetch.",
    },
    sortByParam([
      ["name", "Name"],
      ["created", "Created"],
      ["updated", "Updated"],
      ["mediaCount", "Media count"],
      ["id", "ID"],
    ]),
    sortDirectionParam,
    ...paginationParams(50),
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    const rows = await new WistiaClient(ctx).json<unknown[]>("/folders", {
      query: { ...listQuery(input), "hashed_ids[]": toList(input.hashedIds) },
    });
    return pageOf(rows);
  },
};

export default folderList;
