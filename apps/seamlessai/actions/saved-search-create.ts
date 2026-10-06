import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toObject } from "../lib/client.ts";

/** `POST /api/client/v2/saved-searches` — Create Saved Search. */
interface Input {
  name: string;
  type: string;
  values: unknown;
  sortColumn?: string;
  sortOrder?: string;
}

const savedSearchCreate: ActionDefinition<Input> = {
  key: "saved-search-create",
  type: "perform",
  resource: "saved-search",
  title: "Create Saved Search",
  description:
    "Save a set of search filters so contacts-search / companies-search can re-run them by ID.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "contacts", label: "contacts" }, {
        value: "companies",
        label: "companies",
      }],
    },
    {
      key: "values",
      label: "Filter values",
      type: "json",
      required: true,
      hint: "A JSON object of the search filters to store (same fields as the search actions).",
    },
    { key: "sortColumn", label: "Sort column", type: "string" },
    { key: "sortOrder", label: "Sort order", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/saved-searches", {
      body: compact({
        name: need(input.name, "Name"),
        type: need(input.type, "Type"),
        values: need(toObject(input.values, "Filter values"), "Filter values"),
        sortColumn: input.sortColumn,
        sortOrder: input.sortOrder,
      }),
    });
  },
};

export default savedSearchCreate;
