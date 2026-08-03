import type { ActionDefinition } from "@w6w/types";
import {
  parseJson,
  parseJsonOptional,
  QuickbaseClient,
  type QuickbaseRecord,
} from "../lib/client.ts";

interface Input {
  tableId: string;
  data: unknown;
  mergeFieldId?: number;
  fieldsToReturn?: unknown;
}

/**
 * Metadata block from `POST /records`. All five keys are Quickbase's own names.
 */
export interface UpsertMetadata {
  createdRecordIds?: number[];
  updatedRecordIds?: number[];
  unchangedRecordIds?: number[];
  totalNumberOfRecordsProcessed?: number;
  /**
   * Present only when some rows failed. Keyed by the row's **1-based sequence
   * number in the payload you sent**, valued with that row's errors.
   */
  lineErrors?: Record<string, string[]>;
}

export interface UpsertResult {
  data?: QuickbaseRecord[];
  metadata?: UpsertMetadata;
  /**
   * True when Quickbase reported per-row failures. Surfaced as a first-class
   * field so a workflow can branch on it without digging into `metadata`.
   */
  partialFailure: boolean;
}

/**
 * `POST /records` — insert and update in one call.
 *
 * ## Insert vs update is decided by the payload, not by the endpoint
 *
 * There is no separate create/update route. A row that includes the table's key
 * field (field ID 3, "Record ID#", unless the table says otherwise) updates that
 * record; a row without it inserts. `mergeFieldId` swaps the key field for some
 * other unique field, which is how you upsert on a natural key like an email
 * address.
 *
 * Rows are keyed by **field ID**, each value wrapped in `{ value }`:
 *
 * ```json
 * [ { "6": { "value": "Acme Corp" }, "7": { "value": 10 } } ]
 * ```
 *
 * ## HTTP 207: the failure mode that looks like success
 *
 * This endpoint declares **200, 207 and 400**. A 207 means *some rows were
 * written and some were rejected* — and 207 is a 2xx, so `response.ok` is
 * `true` and a client that only checks it reports total success while silently
 * dropping rows.
 *
 * Quickbase reports the casualties in `metadata.lineErrors`, keyed by the row's
 * 1-based position in the payload you sent:
 *
 * ```json
 * { "data": [], "metadata": {
 *     "createdRecordIds": [11, 12],
 *     "lineErrors": { "2": ["Incompatible value for field with ID \"6\"."] },
 *     "totalNumberOfRecordsProcessed": 3 } }
 * ```
 *
 * Note `totalNumberOfRecordsProcessed` counts successes **and** failures, so it
 * is not a success count either.
 *
 * This action therefore does two things a naive wrapper would not: it sets
 * `partialFailure` so a workflow can branch on the condition without inspecting
 * nested metadata, and it logs a warning naming the failed rows. It does NOT
 * throw — the rows that succeeded really were written, and turning a partial
 * write into an exception would strand them with no record of what landed.
 */
const upsertRecords: ActionDefinition<Input, UpsertResult> = {
  key: "upsert-records",
  type: "perform",
  resource: "record",
  title: "Insert or Update Records",
  // `false`, as the honest worst case. A row carrying the key field (or a
  // `mergeFieldId`) converges on replay — but a row WITHOUT one inserts, so a
  // retry of that same payload creates a duplicate. Quickbase offers no
  // idempotency key to close the gap, and the action cannot know which shape
  // the caller sent until it inspects the data.
  idempotent: false,
  description:
    "Insert and/or update records in one call. Rows carrying the key field update; rows without it insert. Reports per-row failures via `partialFailure`.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "data",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'Array of records keyed by FIELD ID, values wrapped: [{"6": {"value": "Acme"}, "7": {"value": 10}}]. Include the key field (usually 3) to update.',
    },
    {
      key: "mergeFieldId",
      label: "Merge field ID",
      type: "number",
      hint:
        "Upsert on this unique field instead of the table's key field — e.g. the field holding an email address.",
    },
    {
      key: "fieldsToReturn",
      label: "Field IDs to return",
      type: "json",
      hint: "Array of field IDs to echo back for each written record, e.g. [6, 7].",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Returned records" },
    { key: "metadata", type: "object", label: "Created/updated/unchanged record IDs" },
    { key: "partialFailure", type: "boolean", label: "Some rows were rejected" },
  ],

  async execute(input, ctx) {
    const client = new QuickbaseClient(ctx);

    const body = await client.request<Omit<UpsertResult, "partialFailure">>("records", {
      method: "POST",
      body: {
        to: input.tableId,
        data: parseJson<QuickbaseRecord[]>(input.data, "Records"),
        mergeFieldId: input.mergeFieldId,
        fieldsToReturn: parseJsonOptional<number[]>(input.fieldsToReturn, "Field IDs to return"),
      },
    });

    const lineErrors = body.metadata?.lineErrors;
    const failedRows = lineErrors ? Object.keys(lineErrors) : [];
    if (failedRows.length > 0) {
      ctx.log(
        "warn",
        `Quickbase rejected ${failedRows.length} of ${
          body.metadata?.totalNumberOfRecordsProcessed ?? "?"
        } row(s); the rest were written.`,
        { rows: failedRows, lineErrors },
      );
    }

    return { ...body, partialFailure: failedRows.length > 0 };
  },
};

export default upsertRecords;
