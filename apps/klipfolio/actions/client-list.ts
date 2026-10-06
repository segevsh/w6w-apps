import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  external_id?: string;
  status?: string;
}

/** `GET /clients`. */
const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "List the client accounts of the company.",
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
    { key: "external_id", label: "External ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "trial", label: "Trial" }, {
        value: "setup",
        label: "Setup",
      }, { value: "disabled", label: "Disabled" }],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Result rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "total", type: "number", label: "Total rows" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/clients`, {
      query: {
        limit: input.limit,
        offset: input.offset,
        external_id: input.external_id,
        status: input.status,
      },
    });
    return listResult(env);
  },
};

export default clientList;
