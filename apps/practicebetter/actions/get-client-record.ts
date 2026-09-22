import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /consultant/records/{recordId}` — read one client record.
 *
 * Security: `[read]`.
 *
 * The response wraps a `client` object (the person's own details) alongside the
 * record's own `id`, `dateCreated`, `dateModified`, `dateActivated`, `isActive`,
 * `invitationSent` and more. The five fields declared in `output` are the ones a
 * follow-up step almost always keys off; the rest of the record passes through
 * untouched.
 *
 * **Non-standard status worth knowing about:** the document declares **`461
 * Resource Access Denied`** on this operation, in addition to the usual
 * `401`/`403`/`404`. It is not a new error class and this app does not
 * special-case it — any non-2xx is a failure the normal way, and `461` will
 * appear in the thrown message's status. It is noted here only so that a run
 * log showing `HTTP 461` is recognised rather than treated as a mystery.
 */
interface Input {
  recordId: string;
}

const getClientRecord: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-client-record",
  type: "read",
  resource: "client-record",
  title: "Get Client Record",
  description:
    "Read one client record by id — its active flag, timestamps and the nested `client` details.",
  params: [
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's `id`. Use `list-client-records` to find it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "isActive", type: "boolean", label: "Active" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "client", type: "object", label: "The client's own details" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request(
      `/consultant/records/${encodeId(input.recordId)}`,
    );
  },
};

export default getClientRecord;
