import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listItems from "../actions/list-items.ts";

interface Params {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
}

export default pollFromListAction<Params>({
  key: "new-list-item",
  title: "New List Item",
  description: "Fires for rows newly created in a SharePoint list.",
  action: listItems as unknown as ActionDefinition,
  input: ({ siteId, hostname, path, listId }) => ({
    siteId,
    hostname,
    path,
    listId,
    orderby: "createdDateTime desc",
    top: 100,
    all: false,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    { key: "siteId", label: "Site ID", type: "string" },
    { key: "hostname", label: "Site hostname", type: "string" },
    { key: "path", label: "Site path", type: "string" },
    { key: "listId", label: "List ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "List item ID" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "fields", type: "object", label: "Fields" },
  ],
  sample: {
    id: "42",
    createdDateTime: "2026-11-09T12:00:00Z",
    fields: { Title: "Quarterly report" },
  },
  maxPages: 1,
});
