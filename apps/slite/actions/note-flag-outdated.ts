import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, noteOutput, seg } from "../lib/params.ts";

/**
 * `PUT /v1/notes/{noteId}/flag-as-outdated` (operationId `flagNoteAsOutdated`).
 *
 * The summary says "optional reason" but the body schema marks `reason` as required; the schema
 * is what is followed, so a blank reason is refused before any request.
 */
interface Input {
  noteId: string;
  reason: string;
}

const noteFlagOutdated: ActionDefinition<Input> = {
  key: "note-flag-outdated",
  type: "perform",
  resource: "note",
  title: "Flag Note as Outdated",
  description: "Set a note's review state to Outdated with a reason.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "reason",
      label: "Reason",
      type: "string",
      required: true,
      placeholder: "Information is incorrect",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    const reason = (input.reason ?? "").trim();
    if (!reason) throw new Error("reason is required");
    return new SliteClient(ctx).request(
      `/notes/${seg(input.noteId, "noteId")}/flag-as-outdated`,
      { method: "PUT", body: { reason } },
    );
  },
};

export default noteFlagOutdated;
