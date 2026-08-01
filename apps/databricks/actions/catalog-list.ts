import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** GET /api/2.1/unity-catalog/catalogs. Verified against n8n's `unityCatalog/listCatalogs.operation.ts`. */
const catalogList: ActionDefinition<Input> = {
  key: "catalog-list",
  type: "search",
  resource: "catalog",
  title: "List Catalogs",
  description: "List Unity Catalog catalogs in the workspace.",
  params: [],
  output: [
    { key: "catalogs", type: "array", label: "Catalogs" },
  ],

  execute(_input, ctx) {
    const client = new DatabricksClient(ctx);
    return client.request("/api/2.1/unity-catalog/catalogs");
  },
};

export default catalogList;
