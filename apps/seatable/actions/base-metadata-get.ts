import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";

const baseMetadataGet: ActionDefinition<Record<string, never>> = {
  key: "base-metadata-get",
  type: "read",
  resource: "base",
  title: "Get Base Metadata",
  description:
    "The structure of the connected base — every table with its columns and views, plus " +
    "settings. Contains no row data. Use it to find table names, column names and the " +
    "`link_id` / table `_id` values the link actions need.",
  params: [],
  output: [
    { key: "metadata", type: "object", label: "Metadata (tables, columns, views, settings)" },
  ],

  execute(_input, ctx) {
    return new SeaTableClient(ctx).request("/metadata/");
  },
};

export default baseMetadataGet;
