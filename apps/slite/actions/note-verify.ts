import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, noteOutput, seg } from "../lib/params.ts";

/**
 * `PUT /v1/notes/{noteId}/verify` (operationId `verifyNote`).
 *
 * The body field `until` is REQUIRED but nullable: an ISO date-time sets when the verification
 * expires, and an explicit `null` means it never expires. So an empty form field is sent as
 * `null`, not omitted.
 */
interface Input {
  noteId: string;
  until?: string;
}

const noteVerify: ActionDefinition<Input> = {
  key: "note-verify",
  type: "perform",
  resource: "note",
  title: "Verify Note",
  description: "Mark a note Verified, optionally until an expiry date.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "until",
      label: "Verified until",
      type: "datetime",
      hint: "When the verification expires. Leave empty for no expiration.",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    return new SliteClient(ctx).request(`/notes/${seg(input.noteId, "noteId")}/verify`, {
      method: "PUT",
      body: { until: input.until || null },
    });
  },
};

export default noteVerify;
