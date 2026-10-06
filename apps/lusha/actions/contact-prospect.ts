import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  filters: unknown;
  page?: number;
  size?: number;
  includePartialProfiles?: boolean;
  excludeDnc?: boolean;
  maxContactsPerCompany?: number;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-prospect",
  type: "read",
  resource: "contact",
  title: "Prospect Contacts",
  description:
    "Find contacts matching an ideal-customer profile with contact and company filters. Page through with page/size. Use the filter-list actions to discover valid filter values.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint:
        '{"contacts":{"include":{"jobTitles":["CTO"],"countries":["US"]}},"companies":{"include":{"sizes":[...]}}} \u2014 see Contact Filter List.',
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
    { key: "excludeDnc", label: "Exclude do-not-contact", type: "boolean" },
    { key: "maxContactsPerCompany", label: "Max contacts per company", type: "number" },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Matching contact previews" },
    { key: "pagination", type: "object", label: "page, size, total" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/prospecting`, {
      body: compact({
        pagination: { page: input.page ?? 0, size: input.size ?? 25 },
        filters: jsonValue(input.filters),
        tableId: input.tableId,
        options: optionsOf(
          compact({
            includePartialProfiles: input.includePartialProfiles,
            excludeDnc: input.excludeDnc,
            maxContactsPerCompany: input.maxContactsPerCompany,
          }),
        ),
      }),
    });
  },
};

export default action;
