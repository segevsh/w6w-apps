import type { ActionDefinition } from "@w6w/types";
import { encodeId, pageOf, WistiaClient } from "../lib/client.ts";
import {
  folderIdParam,
  type ListInput,
  listQuery,
  pageOutput,
  paginationParams,
  sortByParam,
  sortDirectionParam,
} from "../lib/params.ts";

interface Input extends ListInput {
  folderId: string;
}

const subfolderList: ActionDefinition<Input> = {
  key: "subfolder-list",
  type: "search",
  resource: "folder",
  title: "List Subfolders",
  description: "List the subfolders of one folder.",
  params: [
    folderIdParam,
    sortByParam([
      ["name", "Name"],
      ["created", "Created"],
      ["updated", "Updated"],
      ["position", "Position"],
      ["id", "ID"],
    ]),
    sortDirectionParam,
    ...paginationParams(50),
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    const rows = await new WistiaClient(ctx).json<unknown[]>(
      `/folders/${encodeId(input.folderId)}/subfolders`,
      { query: listQuery(input) },
    );
    return pageOf(rows);
  },
};

export default subfolderList;
