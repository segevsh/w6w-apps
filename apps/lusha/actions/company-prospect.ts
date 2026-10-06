import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  filters: unknown;
  page?: number;
  size?: number;
  includePartialProfiles?: boolean;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "company-prospect",
  type: "read",
  resource: "company",
  title: "Prospect Companies",
  description:
    "Find companies matching firmographic, technology, intent and signal filters. Page through with page/size.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint:
        '{"companies":{"include":{"sizes":[...],"technologies":[...]}}} \u2014 see Company Filter List.',
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "0-based, max 1000. Default 0.",
      validation: { min: 0, max: 1000, integer: true },
    },
    {
      key: "size",
      label: "Page size",
      type: "number",
      hint: "10-100. Default 25.",
      validation: { min: 10, max: 100, integer: true },
    },
    {
      key: "includePartialProfiles",
      label: "Include partial profiles",
      type: "boolean",
      hint: "Also return profiles with only partial data.",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Matching company previews" },
    { key: "pagination", type: "object", label: "page, size, total" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/prospecting`, {
      body: compact({
        pagination: { page: input.page ?? 0, size: input.size ?? 25 },
        filters: jsonValue(input.filters),
        tableId: input.tableId,
        options: optionsOf(compact({ includePartialProfiles: input.includePartialProfiles })),
      }),
    });
  },
};

export default action;
