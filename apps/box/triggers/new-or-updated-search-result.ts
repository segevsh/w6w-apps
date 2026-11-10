import { pollFromListAction } from "../../_shared/poll/mod.ts";
import search from "../actions/search.ts";

type Params = {
  query: string;
  type?: "file" | "folder" | "web_link";
  scope?: "user_content" | "enterprise_content";
  ancestorFolderIds?: string;
};

function resultId(item: unknown): string {
  const { id, type, modified_at: modifiedAt } = item as {
    id?: unknown;
    type?: unknown;
    modified_at?: unknown;
  };
  if (typeof id !== "string" || id === "") throw new Error("Box search result has no id");
  return `${String(type ?? "")}:${id}:${String(modifiedAt ?? "")}`;
}

/**
 * Wraps `search` (`GET /search`) sorted `modified_at` descending, which Box documents as "the
 * results ordered in descending order by date at which the item was last modified"
 * (https://developer.box.com/reference/get-search/). An edit changes `modified_at`, so it is a
 * new event.
 */
const newOrUpdatedSearchResult = pollFromListAction<Params>({
  key: "new-or-updated-search-result",
  title: "New or Updated Search Result",
  description:
    "Polls a Box search and fires for each match that is new or was modified since the last check. The run gets the file, folder or web link.",
  action: search,
  input: (params) => ({
    query: params.query,
    type: params.type,
    scope: params.scope,
    ancestorFolderIds: params.ancestorFolderIds,
    limit: 100,
    sort: "modified_at",
    direction: "DESC",
  }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: resultId,
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "The Box search query. Box indexes new content with a delay.",
    },
    {
      key: "type",
      label: "Item type",
      type: "select",
      options: [
        { value: "file", label: "File" },
        { value: "folder", label: "Folder" },
        { value: "web_link", label: "Web Link" },
      ],
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: [
        { value: "user_content", label: "User content" },
        { value: "enterprise_content", label: "Enterprise content" },
      ],
    },
    {
      key: "ancestorFolderIds",
      label: "Folder IDs",
      type: "string",
      hint: "Comma-separated Box folder IDs to restrict the search to.",
    },
  ],
  output: [
    { key: "id", label: "ID", type: "string" },
    { key: "type", label: "Type", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "modified_at", label: "Modified at", type: "string" },
  ],
  sample: {
    id: "987654321",
    type: "file",
    name: "report.pdf",
    created_at: "2026-11-01T09:00:00-08:00",
    modified_at: "2026-11-09T12:00:00-08:00",
  },
});

export default newOrUpdatedSearchResult;
