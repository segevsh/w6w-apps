import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  datasource_id?: string;
  client_id?: string;
}

/** `GET /datasource-instances`. */
const datasourceInstanceList: ActionDefinition<Input> = {
  key: "datasource-instance-list",
  type: "read",
  resource: "datasource-instance",
  title: "List Data Source Instances",
  description: "List data source instances, optionally only those of one data source.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Page size, 1-100 (default 25).",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Index of the first result (default 0).",
      validation: { min: 0, integer: true },
    },
    {
      key: "datasource_id",
      label: "Data Source ID",
      type: "string",
      hint: "Only instances of this data source (the data source id, not an instance id).",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Result rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "total", type: "number", label: "Total rows" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/datasource-instances`, {
      query: {
        limit: input.limit,
        offset: input.offset,
        datasource_id: input.datasource_id,
        client_id: input.client_id,
      },
    });
    return listResult(env);
  },
};

export default datasourceInstanceList;
