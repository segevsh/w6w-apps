import type { ActionDefinition } from "@w6w/types";
import {
  CopperClient,
  SEARCH_OUTPUT,
  SEARCH_PARAMS,
  searchBody,
  type SearchInput,
  type SearchResult,
} from "../lib/client.ts";

interface Input extends SearchInput {
  name?: string;
  statusIds?: number[] | null;
  pipelineIds?: number[] | null;
  pipelineStageIds?: number[] | null;
  companyIds?: number[] | null;
  primaryContactIds?: number[] | null;
  assigneeIds?: number[] | null;
  customerSourceIds?: number[] | null;
  tags?: string[] | null;
  minimumMonetaryValue?: number;
  maximumMonetaryValue?: number;
  minimumCloseDate?: number;
  maximumCloseDate?: number;
  minimumModifiedDate?: number;
  maximumModifiedDate?: number;
}

/**
 * `POST /opportunities/search` — list and filter Opportunities (deals).
 *
 * `status_ids` is the one filter whose values are hard-coded rather than looked
 * up: Copper documents "The possible values are 0, 1, 2, 3, for 'Open', 'Won',
 * 'Lost', and 'Abandoned', respectively" — which is why they are offered as a
 * fixed `select` here while pipeline and stage ids are free-form numbers you
 * read from List Pipelines / List Pipeline Stages.
 *
 * Note the asymmetry between filter and field: searching takes numeric
 * `status_ids`, but the Opportunity object itself carries `status` as the string
 * "Open"/"Won"/"Lost"/"Abandoned", which is what Create and Update take. That is
 * Copper's design, not a translation applied here.
 */
const searchOpportunities: ActionDefinition<Input> = {
  key: "search-opportunities",
  type: "search",
  resource: "opportunity",
  title: "Search Opportunities",
  description:
    "List and filter Opportunities via `POST /opportunities/search` — filters, sorting and paging " +
    "go in the request body.",
  params: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "statusIds",
      label: "Status IDs",
      type: "multiselect",
      options: [
        { value: 0, label: "Open" },
        { value: 1, label: "Won" },
        { value: 2, label: "Lost" },
        { value: 3, label: "Abandoned" },
      ],
      hint: "Copper hard-codes these four ids. The Opportunity object itself reports `status` as " +
        "the equivalent string.",
    },
    {
      key: "pipelineIds",
      label: "Pipeline IDs",
      type: "json",
      hint: "JSON array. Read the ids from the List Pipelines action.",
    },
    {
      key: "pipelineStageIds",
      label: "Pipeline stage IDs",
      type: "json",
      hint: "JSON array. Read the ids from the List Pipeline Stages action.",
    },
    { key: "companyIds", label: "Company IDs", type: "json", hint: "JSON array." },
    {
      key: "primaryContactIds",
      label: "Primary contact (Person) IDs",
      type: "json",
      hint: "JSON array.",
    },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "json",
      hint: "JSON array of User ids, or `[-2]` for Opportunities with no owner.",
    },
    {
      key: "customerSourceIds",
      label: "Customer source IDs",
      type: "json",
      hint: "JSON array, or `[-2]` for no source. Read the ids from `GET /customer_sources`.",
    },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array; matches at least one." },
    { key: "minimumMonetaryValue", label: "Minimum value", type: "number" },
    { key: "maximumMonetaryValue", label: "Maximum value", type: "number" },
    {
      key: "minimumCloseDate",
      label: "Close date after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "maximumCloseDate",
      label: "Close date before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "minimumModifiedDate",
      label: "Modified after",
      type: "number",
      hint: "Unix timestamp (seconds). The usual filter for an incremental sync.",
    },
    {
      key: "maximumModifiedDate",
      label: "Modified before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search(
      "/opportunities/search",
      searchBody(input, {
        name: input.name,
        status_ids: input.statusIds ?? undefined,
        pipeline_ids: input.pipelineIds ?? undefined,
        pipeline_stage_ids: input.pipelineStageIds ?? undefined,
        company_ids: input.companyIds ?? undefined,
        primary_contact_ids: input.primaryContactIds ?? undefined,
        assignee_ids: input.assigneeIds ?? undefined,
        customer_source_ids: input.customerSourceIds ?? undefined,
        tags: input.tags ?? undefined,
        minimum_monetary_value: input.minimumMonetaryValue,
        maximum_monetary_value: input.maximumMonetaryValue,
        minimum_close_date: input.minimumCloseDate,
        maximum_close_date: input.maximumCloseDate,
        minimum_modified_date: input.minimumModifiedDate,
        maximum_modified_date: input.maximumModifiedDate,
      }),
    );
  },
};

export default searchOpportunities;
