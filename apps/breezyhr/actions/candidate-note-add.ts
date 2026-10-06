import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  body: string;
}

/** `POST …/candidate/{id}/stream` — an internal note; never visible to the candidate. */
const candidateNoteAdd: ActionDefinition<Input> = {
  key: "candidate-note-add",
  type: "perform",
  resource: "candidate",
  title: "Add Candidate Note",
  description:
    "Post an internal note to a candidate's activity stream. Notes are team-only and never shown to the candidate.",
  idempotent: false,
  params: [
    ...candidateParams,
    { key: "body", label: "Note", type: "text", required: true },
  ],
  output: [
    { key: "_id", type: "string", label: "Stream activity ID" },
    { key: "type", type: "string", label: "Activity type" },
    { key: "object", type: "object", label: "The note, with position/candidate/user context" },
    { key: "timestamp", type: "string", label: "Posted at" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "POST",
      `${candidate(input.companyId, input.positionId, input.candidateId)}/stream`,
      { body: { body: input.body } },
    );
  },
};

export default candidateNoteAdd;
