import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import {
  bracketedFilterParams,
  fieldsParam,
  listOutput,
  noteTypeOptions,
  pageCursorParam,
  sourceFilterParams,
} from "../lib/params.ts";

/**
 * `GET /v2/notes` — customer feedback, ideas, conversations and insights.
 *
 * `processed` is the filter this endpoint exists for. In Productboard a note
 * arrives unprocessed and a human triages it into the hierarchy; `processed=false`
 * is "the inbox", which is what an automation usually wants. It is not the same
 * as `archived`, and both default to *unfiltered* — leaving either empty returns
 * archived and unarchived, processed and unprocessed alike.
 *
 * The four date filters are `createdFrom`/`createdTo`/`updatedFrom`/`updatedTo`,
 * all full ISO 8601 date-times. v1's `last` shorthand (`6m`, `10d`, `24h`) does
 * not exist in v2.
 *
 * Note the parameter-name inconsistency in the vendor's own document, which this
 * app follows exactly rather than tidying: the field selector is **`fields`**
 * here and **`fields[]`** on `POST /v2/notes/search` and on every entities
 * endpoint. Sending the wrong spelling is silently ignored, which is worse than
 * an error.
 */
interface Input {
  types?: string[] | string;
  archived?: boolean;
  processed?: boolean;
  ownerId?: string;
  ownerEmail?: string;
  creatorId?: string;
  creatorEmail?: string;
  sourceSystem?: string;
  sourceRecordId?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  fields?: string;
  pageCursor?: string;
}

const noteList: ActionDefinition<Input, ListResult> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List notes",
  description:
    "List customer feedback notes, filtered by type, processing state, owner, creator, source " +
    "system or date range.",
  params: [
    {
      key: "types",
      label: "Note types",
      type: "multiselect",
      options: noteTypeOptions,
      hint: "Sent as repeated `type[]` values.",
    },
    {
      key: "processed",
      label: "Processed",
      type: "boolean",
      hint: "Set false for the triage inbox — notes nobody has linked to the hierarchy yet. " +
        "Leave empty to return both.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Leave empty to return both.",
    },
    ...bracketedFilterParams("owner", "Owner"),
    ...bracketedFilterParams("creator", "Creator"),
    ...sourceFilterParams,
    {
      key: "createdFrom",
      label: "Created from",
      type: "datetime",
      hint: "ISO 8601, e.g. 2023-10-01T00:00:00Z. v1's `last` shorthand does not exist in v2.",
    },
    { key: "createdTo", label: "Created to", type: "datetime" },
    { key: "updatedFrom", label: "Updated from", type: "datetime" },
    { key: "updatedTo", label: "Updated to", type: "datetime" },
    {
      ...fieldsParam,
      hint: fieldsParam.hint +
        " On THIS endpoint the query key is `fields`, not `fields[]` — the vendor spells it both " +
        "ways across the API.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/notes", {
      query: {
        "type[]": toList(input.types),
        archived: input.archived,
        processed: input.processed,
        "owner[id]": input.ownerId,
        "owner[email]": input.ownerEmail,
        "creator[id]": input.creatorId,
        "creator[email]": input.creatorEmail,
        "metadata[source][system]": input.sourceSystem,
        "metadata[source][recordId]": input.sourceRecordId,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
        updatedFrom: input.updatedFrom,
        updatedTo: input.updatedTo,
        fields: toList(input.fields),
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default noteList;
