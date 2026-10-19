import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";
import { searchDatabaseContainers } from "../lib/databases.ts";

interface Input {
  pageSize?: number;
  startCursor?: string;
}

const listDatabases: ActionDefinition<Input, NotionListResponse> = {
  key: "list-databases",
  type: "read",
  resource: "database",
  title: "List Databases",
  description:
    "Find shared database containers via data source search. Search indexing is not exhaustive. One page per call — pass `startCursor` back to walk.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "startCursor", label: "Start cursor", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "Databases" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return searchDatabaseContainers(client, {
      filter: { property: "object", value: "data_source" },
      page_size: input.pageSize ?? 100,
      start_cursor: input.startCursor,
    });
  },
};

export default listDatabases;
