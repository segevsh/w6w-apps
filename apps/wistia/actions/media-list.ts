import type { ActionDefinition } from "@w6w/types";
import { pageOf, toList, WistiaClient } from "../lib/client.ts";
import {
  type ListInput,
  listQuery,
  mediaTypeOptions,
  pageOutput,
  paginationParams,
  sortByParam,
  sortDirectionParam,
} from "../lib/params.ts";

interface Input extends ListInput {
  folderId?: string;
  name?: string;
  type?: string;
  tags?: string[] | string;
  hashedIds?: string[] | string;
  archived?: boolean;
  includeSpeakers?: boolean;
}

const mediaList: ActionDefinition<Input> = {
  key: "media-list",
  type: "search",
  resource: "media",
  title: "List Media",
  description:
    "List the media in the account, optionally filtered by folder, name, type, tags or hashed IDs.",
  params: [
    { key: "folderId", label: "Folder hashed ID", type: "string" },
    { key: "name", label: "Name", type: "string", hint: "Exact match." },
    { key: "type", label: "Type", type: "select", options: mediaTypeOptions },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    {
      key: "hashedIds",
      label: "Hashed IDs",
      type: "string",
      hint: "Comma-separated hashed IDs, for a batch fetch.",
    },
    {
      key: "archived",
      label: "Archived only",
      type: "boolean",
      hint: "Leave unset to use Wistia's default; true lists archived media.",
    },
    { key: "includeSpeakers", label: "Include speakers", type: "boolean" },
    sortByParam([
      ["name", "Name"],
      ["created", "Created"],
      ["updated", "Updated"],
      ["position", "Position"],
    ], "Cursor pagination supports only id and created; the others need offset pagination."),
    sortDirectionParam,
    ...paginationParams(50),
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    const rows = await new WistiaClient(ctx).json<unknown[]>("/medias", {
      query: {
        ...listQuery(input),
        folder_id: input.folderId,
        name: input.name,
        type: input.type,
        "tags[]": toList(input.tags),
        "hashed_ids[]": toList(input.hashedIds),
        archived: input.archived,
        include: input.includeSpeakers ? "speakers" : undefined,
      },
    });
    return pageOf(rows);
  },
};

export default mediaList;
