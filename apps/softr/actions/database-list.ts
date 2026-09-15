import type { ActionDefinition } from "@w6w/types";
import { TablesClient } from "../lib/client.ts";

/**
 * `GET /databases` — every Softr Database this token's workspace(s) can see.
 *
 * This is also the credential-liveness probe (`auth/api-key.ts`); no `/me` or
 * `/whoami` endpoint exists on this host, so this is the cheapest read Softr
 * documents at all.
 */
interface Output {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    workspaceId: string;
    tablesCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

const databaseList: ActionDefinition<Record<string, never>> = {
  key: "database-list",
  type: "search",
  resource: "database",
  title: "List Databases",
  description: "List every Softr Database accessible to this token.",
  params: [],
  output: [{ key: "data", type: "array", label: "Databases" }],

  async execute(_input, ctx) {
    const data = await new TablesClient(ctx).data<Output["data"]>("/databases");
    return { data: data ?? [] };
  },
};

export default databaseList;
