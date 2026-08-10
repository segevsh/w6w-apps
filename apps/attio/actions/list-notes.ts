import type { ActionDefinition } from "@w6w/types";
import {
  AttioClient,
  compact,
  NOTES_DEFAULT_LIMIT,
  NOTES_MAX_LIMIT,
  PAGE_OUTPUT,
  pageParams,
} from "../lib/client.ts";

interface Input {
  parentObject?: string;
  parentRecordId?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/notes` — notes across the workspace, or for one record.
 *
 * "List notes for all records or for a specific record." Both filters are
 * optional; supplying `parent_record_id` without `parent_object` is not
 * meaningful, since a record id is only unique within its object, so this action
 * documents them as a pair.
 *
 * ## The pagination default here is 10, not 500
 *
 * The single most consequential detail on this endpoint, and it is easy to miss
 * because every other listing in this app defaults far higher: "The maximum
 * number of results to return. The default is `10` and the maximum is `50`."
 *
 * A workflow that calls this and assumes it got everything will process the ten
 * most recent notes and silently ignore the rest. The limit param says so, and
 * `MAX_LIMIT` is enforced client-side by the validation so the mistake surfaces
 * at the form rather than as a 400.
 */
const listNotes: ActionDefinition<Input> = {
  key: "list-notes",
  type: "search",
  resource: "note",
  title: "List Notes",
  description:
    "List notes, optionally for a single record. **Attio defaults this endpoint to 10 results " +
    "and caps it at 50** — far lower than the other listings here, so page explicitly if you " +
    "need them all.",
  params: [
    {
      key: "parentObject",
      label: "Parent object",
      type: "string",
      placeholder: "people",
      row: "parent",
      hint: "Restrict to notes on one object. Give this together with the record id below.",
    },
    {
      key: "parentRecordId",
      label: "Parent record id",
      type: "string",
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      row: "parent",
      hint: "Restrict to one record's notes. A record id only identifies a record within its " +
        "object, so pair this with the object above.",
    },
    ...pageParams({ defaultLimit: NOTES_DEFAULT_LIMIT, maxLimit: NOTES_MAX_LIMIT }),
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list("/notes", {
      query: compact({
        parent_object: input.parentObject,
        parent_record_id: input.parentRecordId,
        limit: input.limit,
        offset: input.offset,
      }),
    });
    return { records };
  },
};

export default listNotes;
