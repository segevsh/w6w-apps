import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/plans` — List plans in a source. */
interface Input {
  source_id: string;
  search?: string;
  per_page?: number;
  page?: number;
}

const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "List plans in a source.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "search", label: "Search", type: "string", hint: "Matches name or oid." },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "plans", type: "array", label: "Plans" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", `/${encodeId(input.source_id)}/plans`, {
      query: { search: input.search, per_page: input.per_page, page: input.page },
    });
  },
};

export default planList;
