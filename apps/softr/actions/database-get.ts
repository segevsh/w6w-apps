import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam } from "../lib/params.ts";

/** `GET /databases/{databaseId}` — a single Database's metadata. */
interface Input {
  databaseId: string;
}

interface Database {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  tablesCount: number;
  createdAt: string;
  updatedAt: string;
}

const databaseGet: ActionDefinition<Input> = {
  key: "database-get",
  type: "read",
  resource: "database",
  title: "Get Database",
  description: "Retrieve details of a specific Softr Database by its ID.",
  params: [databaseIdParam],
  output: [
    { key: "id", type: "string", label: "Database ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "tablesCount", type: "number", label: "Number of tables" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return await new TablesClient(ctx).data<Database>(`/databases/${encodeId(input.databaseId)}`);
  },
};

export default databaseGet;
