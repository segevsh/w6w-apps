import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `DELETE /consultant/records/{recordId}` — delete a client record.
 *
 * Security: `[read, write]`. The document declares no response body (`200`/`202`),
 * so the action reports the status it got rather than a parsed object — and the
 * client's `status()` helper is used precisely so a body-less success is not
 * mistaken for a parse failure.
 *
 * Idempotent in the sense the runtime cares about: a retry of the same delete
 * cannot delete a second record, though the second call may answer `404`, which
 * is surfaced rather than swallowed so "wrong id" is not mistaken for "already
 * gone".
 */
interface Input {
  recordId: string;
}

const deleteClientRecord: ActionDefinition<Input, { status: number }> = {
  key: "delete-client-record",
  type: "perform",
  resource: "client-record",
  title: "Delete Client Record",
  description:
    "Delete a client record. Returns the HTTP status; the endpoint has no response body.",
  idempotent: true,
  params: [
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's `id`.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PracticeBetterClient(ctx).status(
      `/consultant/records/${encodeId(input.recordId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default deleteClientRecord;
