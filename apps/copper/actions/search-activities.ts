import type { ActionDefinition } from "@w6w/types";
import {
  CopperClient,
  PARENT_TYPES,
  SEARCH_OUTPUT,
  SEARCH_PARAMS,
  searchBody,
  type SearchInput,
  type SearchResult,
} from "../lib/client.ts";

interface Input extends SearchInput {
  parentType?: string;
  parentId?: number;
  activityTypes?: unknown[] | null;
  minimumActivityDate?: number;
  maximumActivityDate?: number;
  fullResult?: boolean;
}

/**
 * `POST /activities/search` — list Activities (notes, calls, meetings and the
 * system events Copper logs itself).
 *
 * `parent` is an object of `{id, type}`, collected here as two params and
 * assembled — sending a half-built object is the obvious failure mode. Both must
 * be present for the filter to be sent at all.
 *
 * `activity_types` is an array of `{id, category}` objects, not bare ids: Copper
 * numbers `user` and `system` activity types in separate spaces, so an id alone
 * is ambiguous. Read the pairs from the List Activity Types action. Copper's own
 * note: "When supplied as parameters for Activity creation or search, Activity
 * Type objects need only specify the 'category' and 'id' fields."
 *
 * `full_result` is offered because Copper documents it as the escape hatch for a
 * timing-out search — with two caveats stated in its hint rather than buried:
 * "The API key must belong to an administrator. Otherwise, the `full_result`
 * flag will be ignored", and it may return duplicate rows for one activity.
 *
 * Deleted Activities remain readable as stubs, unlike deleted records of every
 * other type.
 */
const searchActivities: ActionDefinition<Input> = {
  key: "search-activities",
  type: "search",
  resource: "activity",
  title: "Search Activities",
  description:
    "List Activities via `POST /activities/search`, optionally scoped to one parent record and " +
    "to specific activity types.",
  params: [
    {
      key: "parentType",
      label: "Parent type",
      type: "select",
      options: PARENT_TYPES.map((t) => ({ value: t, label: t })),
      hint: "Set together with the parent id; Copper takes them as one `{id, type}` object.",
    },
    {
      key: "parentId",
      label: "Parent ID",
      type: "number",
      hint: "Ignored unless a parent type is also chosen.",
    },
    {
      key: "activityTypes",
      label: "Activity types",
      type: "json",
      hint: 'JSON array of `{"id": 0, "category": "user"}` objects — the id alone is ambiguous ' +
        "because user and system types are numbered separately. Read the pairs from the List " +
        "Activity Types action.",
    },
    {
      key: "minimumActivityDate",
      label: "Activity date after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "maximumActivityDate",
      label: "Activity date before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "fullResult",
      label: "Full result",
      type: "boolean",
      hint: "Copper's escape hatch when this search times out. It is ignored unless the API key " +
        "belongs to an administrator, and it may return duplicate rows for a single activity " +
        "(e.g. an email sent to several people).",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    const parent = input.parentType && input.parentId !== undefined
      ? { id: input.parentId, type: input.parentType }
      : undefined;

    return new CopperClient(ctx).search(
      "/activities/search",
      searchBody(input, {
        parent,
        activity_types: input.activityTypes ?? undefined,
        minimum_activity_date: input.minimumActivityDate,
        maximum_activity_date: input.maximumActivityDate,
        full_result: input.fullResult,
      }),
    );
  },
};

export default searchActivities;
