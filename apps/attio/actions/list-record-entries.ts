import type { ActionDefinition } from "@w6w/types";
import {
  AttioClient,
  OBJECT_PARAM,
  PAGE_OUTPUT,
  pageParams,
  pageQuery,
  RECORD_ENTRIES_DEFAULT_LIMIT,
  RECORD_ENTRIES_MAX_LIMIT,
} from "../lib/client.ts";

interface Input {
  object: string;
  recordId: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/objects/{object}/records/{record_id}/entries` — every list this
 * record is on.
 *
 * "List all entries, across all lists, for which this record is the parent."
 *
 * ## The reverse lookup, and why it needs its own action
 *
 * Objects and lists are orthogonal in Attio: a record lives on an object, and
 * *separately* appears as an entry on any number of lists, each of which may
 * carry its own attributes. From the Objects and lists page: "you might be using
 * the deal object to keep track of the various deals you have in progress, but
 * you could also create a list of deals with some additional attributes only
 * relevant to a deal in that list."
 *
 * So "what pipelines is this company in, and at what stage" is not a question
 * about the company record at all — it is this call. Going the other way (List
 * Entries on a named list) cannot answer it without scanning every list.
 *
 * Each result carries `list_id`, `list_api_slug`, `entry_id`, `created_at` and
 * the entry's own values, so a follow-up Update Entry has everything it needs.
 *
 * Pagination here is its own thing again: default 100, maximum 1000.
 */
const listRecordEntries: ActionDefinition<Input> = {
  key: "list-record-entries",
  type: "read",
  resource: "entry",
  title: "List Record Entries",
  description:
    "List every list entry, across all lists, whose parent is this record. The reverse lookup " +
    'for "which pipelines is this company in" — a question the record itself cannot answer.',
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
    },
    ...pageParams({
      defaultLimit: RECORD_ENTRIES_DEFAULT_LIMIT,
      maxLimit: RECORD_ENTRIES_MAX_LIMIT,
    }),
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list(
      `/objects/${encodeURIComponent(input.object)}/records/${
        encodeURIComponent(input.recordId)
      }/entries`,
      { query: pageQuery(input) },
    );
    return { records };
  },
};

export default listRecordEntries;
