import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  pipelineId?: number;
  name?: string;
  email?: string;
  sortField?: string;
  sortDirection?: string;
}

/**
 * `POST /crm/v1/deals/get-list` — despite listing deals, this is a POST: the
 * filter is a JSON body (pipeline, name, contact email/phone, date ranges,
 * arbitrary field/attribute conditions), not query parameters. SendPulse's
 * default `limit` here is **10**, not the 100 a `GET`-shaped list elsewhere
 * in this same API uses (see `contacts-list`) — left as the vendor's default
 * rather than widened, since raising it is one field edit.
 *
 * The response nests differently from `contacts-list` too: `data` is the
 * array directly, and the count lives in a top-level `meta.total` — where
 * `contacts-list` nests the array under `data.list` and the count under
 * `data.total`. Both are read from this one CRM API; neither is a Bulk Email
 * convention. Getting this wrong is the most likely way a first pagination
 * loop against this app silently reads `undefined`.
 */
const action: ActionDefinition<Input> = {
  key: "deals-list",
  type: "search",
  resource: "deal",
  title: "List deals",
  description: "Search deals by pipeline, name or contact email. Response shape: " +
    "`{ data: Deal[], meta: { total } }`.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "SendPulse's own default." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      hint: "Restrict to one pipeline. From `pipelines-list`.",
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      options: [
        { value: "createdAt", label: "Created at" },
        { value: "updatedAt", label: "Updated at" },
      ],
      hint: "Vendor default: created at, ascending.",
      advanced: true,
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      advanced: true,
    },
    { key: "name", label: "Deal name contains", type: "string" },
    { key: "email", label: "Contact email", type: "string", hint: "Find deals for this contact." },
  ],
  output: [
    { key: "data", type: "array", label: "Deals" },
    { key: "meta", type: "object", label: "Pagination — `meta.total`" },
  ],

  async execute(input, ctx) {
    const body = compact({
      limit: input.limit ?? 10,
      offset: input.offset ?? 0,
      pipelineIds: input.pipelineId !== undefined ? [input.pipelineId] : undefined,
      name: input.name,
      email: input.email,
      sortBy: input.sortField !== undefined
        ? { fieldName: input.sortField, direction: input.sortDirection ?? "asc" }
        : undefined,
    });
    return await new SendPulseClient(ctx).crm("/deals/get-list", { method: "POST", body });
  },
};

export default action;
