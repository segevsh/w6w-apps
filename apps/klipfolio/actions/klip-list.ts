import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  datasource_id?: string;
  client_id?: string;
}

/** `GET /klips`. */
const klipList: ActionDefinition<Input> = {
  key: "klip-list",
  type: "read",
  resource: "klip",
  title: "List Klips",
  description: "List the Klips the API key can access, paged with limit and offset.",
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
      hint: "Only Klips built on this data source.",
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
    const env = await new KlipfolioClient(ctx).request("GET", `/klips`, {
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

export default klipList;
