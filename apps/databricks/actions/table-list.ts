import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  catalogName?: string;
  schemaName?: string;
}

/** GET /api/2.1/unity-catalog/tables. Verified against n8n's `unityCatalog/listTables.operation.ts`. */
const tableList: ActionDefinition<Input> = {
  key: "table-list",
  type: "search",
  resource: "table",
  title: "List Tables",
  description: "List Unity Catalog tables, optionally scoped to a catalog and schema.",
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string" },
    { key: "schemaName", label: "Schema Name", type: "string" },
  ],
  output: [
    { key: "tables", type: "array", label: "Tables" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    return client.request("/api/2.1/unity-catalog/tables", {
      query: { catalog_name: input.catalogName, schema_name: input.schemaName },
    });
  },
};

export default tableList;
