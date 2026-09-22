import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `PUT /consultant/records/{recordId}` — update a client record.
 *
 * Security: `[read, write]`. Body schema: `ClientRecordUpdateFragment`, whose
 * fields are all optional (`isActive`, `pinned`, `profile`).
 *
 * ## This is a full replace, in the vendor's own words
 *
 * The document's own description of this operation is the most important thing
 * about it, quoted verbatim: *"ensure you make a request to GET the client
 * record, update any desired fields, and push the entire (updated) client record
 * back to this endpoint. Any missing fields in the post will be erased."*
 *
 * So a `PUT` carrying only `{"isActive": false}` does not change one flag — it
 * erases everything else the record had. The safe sequence is
 * `get-client-record` → edit the object → send the whole thing back, and the
 * action's description says so because a caller who does not know that will lose
 * data on the first run.
 *
 * Idempotent: re-sending the same full body lands on the same state.
 */
interface Input {
  recordId: string;
  isActive?: boolean;
  pinned?: boolean;
  profile?: unknown;
}

const updateClientRecord: ActionDefinition<Input, Record<string, unknown>> = {
  key: "update-client-record",
  type: "perform",
  resource: "client-record",
  title: "Update Client Record",
  description: "Replace a client record (PUT). This is a FULL REPLACE: read the record with " +
    "`get-client-record` first, change what you need, and send the whole record back — any field " +
    "you omit is erased.",
  idempotent: true,
  params: [
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's `id`.",
    },
    {
      key: "isActive",
      label: "Active",
      type: "boolean",
      hint:
        "The record's active flag. Omit only if the record you are sending back already has it.",
    },
    {
      key: "pinned",
      label: "Pinned",
      type: "boolean",
      hint: "Whether the record is pinned in the practice's client list.",
    },
    {
      key: "profile",
      label: "Profile",
      type: "json",
      hint:
        "The full `ClientRecordProfile` object as returned by `get-client-record`. Pass the whole " +
        "profile, not just the fields you are changing — a partial profile erases the rest.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "isActive", type: "boolean", label: "Active" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "client", type: "object", label: "The client's own details" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<Record<string, unknown>>(
      `/consultant/records/${encodeId(input.recordId)}`,
      {
        method: "PUT",
        body: {
          isActive: input.isActive,
          pinned: input.pinned,
          profile: asOptionalJson<Record<string, unknown>>(input.profile, "profile"),
        },
      },
    );
  },
};

export default updateClientRecord;
