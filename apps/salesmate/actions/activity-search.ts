import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { buildSearch, type SearchInput, searchOutput, searchParams } from "../lib/params.ts";

/** Fields returned when the caller names none — all taken from the reference's own sample body. */
const DEFAULT_FIELDS = [
  "activity.id",
  "activity.title",
  "activity.type",
  "activity.isCompleted",
  "activity.dueDate",
  "activity.duration",
  "activity.tags",
  "activity.owner.id",
  "activity.owner.name",
  "activity.primaryContact.id",
  "activity.primaryContact.name",
  "activity.primaryCompany.id",
  "activity.primaryCompany.name",
  "activity.relatedTo.id",
  "activity.relatedTo.title",
  "activity.createdAt",
  "activity.lastModifiedAt",
];

const activitySearch: ActionDefinition<SearchInput> = {
  key: "activity-search",
  type: "search",
  resource: "activity",
  title: "Search Activities",
  description:
    "Search activities with filter rules. With no rules it returns every activity, up to `rows` per request.",
  params: searchParams,
  output: searchOutput,

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<
      { data?: unknown[]; totalRows?: number; totalPages?: number }
    >("/activity/v4/search", {
      method: "POST",
      query: { rows: input.rows, from: input.from, viewType: "list" },
      body: buildSearch("activity", DEFAULT_FIELDS, input),
    });
    return {
      records: data?.data ?? [],
      totalRows: data?.totalRows,
      totalPages: data?.totalPages,
    };
  },
};

export default activitySearch;
