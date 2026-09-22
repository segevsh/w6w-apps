import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
  toList,
} from "../lib/client.ts";

/**
 * `GET /consultant/records` — list the practice's client records.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint in this API declares (`after_id`/`before_id`/`limit`/`skip` in,
 * `{count, hasMore, items}` out — see `lib/client.ts`).
 *
 * Filters beyond pagination, all optional and all passed through as declared:
 * `child` and `client` (which kind of record), `details` (include the nested
 * detail blocks), the `modified_*` window, and `status`.
 *
 * `status` is typed in the document as an array of the `ClientRecordStatus`
 * enum, whose values are `{name, value}` pairs — the document does not publish
 * the names themselves, so this action takes the **names** as free text rather
 * than offering a list it would have had to invent. Array parameters are sent as
 * repeated query keys (OpenAPI 3's default, which the document does not override).
 */
interface Input extends PageInput {
  child?: boolean;
  client?: boolean;
  details?: boolean;
  modified_eq?: string;
  modified_gte?: string;
  modified_lte?: string;
  status?: string[] | string;
}

const listClientRecords: ActionDefinition<Input, Page<unknown>> = {
  key: "list-client-records",
  type: "search",
  resource: "client-record",
  title: "List Client Records",
  description:
    "List client records, optionally filtered by kind (child/client), modification window and status.",
  params: [
    ...pageParams,
    {
      key: "child",
      label: "Child records only",
      type: "boolean",
      hint: "Return only records belonging to a child (a dependant held under a parent record).",
    },
    {
      key: "client",
      label: "Client records only",
      type: "boolean",
      hint:
        "Return only records of the client kind. Practice Better distinguishes the client's own " +
        "record from clinician/child records under the same consultant.",
    },
    {
      key: "details",
      label: "Include details",
      type: "boolean",
      hint: "Include the record's nested detail blocks in each returned item.",
    },
    {
      key: "modified_eq",
      label: "Modified at",
      type: "datetime",
      hint: "Exact `dateModified` match (date-time).",
    },
    {
      key: "modified_gte",
      label: "Modified on or after",
      type: "datetime",
      hint: "Lower bound on `dateModified` (date-time). This is how a sync finds what changed.",
    },
    {
      key: "modified_lte",
      label: "Modified on or before",
      type: "datetime",
      hint: "Upper bound on `dateModified` (date-time).",
    },
    {
      key: "status",
      label: "Statuses",
      type: "multiselect",
      hint:
        "One or more `ClientRecordStatus` names, e.g. the values you see on a record's `status`. " +
        "The document does not publish the name list, so these are typed by hand; each name is " +
        "sent as a repeated `status` query key.",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/records", {
      query: {
        ...pageQuery(input),
        child: input.child,
        client: input.client,
        details: input.details,
        modified_eq: input.modified_eq,
        modified_gte: input.modified_gte,
        modified_lte: input.modified_lte,
        status: toList(input.status),
      },
    });
  },
};

export default listClientRecords;
