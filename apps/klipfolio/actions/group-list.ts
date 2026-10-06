import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  client_id?: string;
}

/** `GET /groups`. */
const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List groups",
  description: "List the groups the API key can access, paged with limit and offset.",
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
    const env = await new KlipfolioClient(ctx).request("GET", `/groups`, {
      query: { limit: input.limit, offset: input.offset, client_id: input.client_id },
    });
    return listResult(env);
  },
};

export default groupList;
