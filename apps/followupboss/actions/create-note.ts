import type { ActionDefinition } from "@w6w/types";
import { compact, FubClient } from "../lib/client.ts";

interface Input {
  personId: number;
  subject?: string;
  body?: string;
  isHtml?: boolean;
}

/**
 * `POST /notes` — add a note to a contact.
 *
 * A small endpoint with a disproportionate rate limit: `notes` is its own
 * metering context at **10 requests per 10-second window** — the strictest
 * documented bucket, 25x tighter than `global`. A loop that notes every record
 * in a list will hit it, and this is the action most likely to earn a 429, so
 * that is stated on the action rather than left to be found.
 *
 * Note the write-side asymmetry: there is a `POST /notes` and a
 * `GET /notes/{id}`, but **no `GET /notes` collection**. Notes are read through
 * the person's timeline, not listed on their own — which is why this app has a
 * Create Note action and no List Notes action.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  idempotent: false,
  description:
    "Add a note to a contact. Rate-limited harder than anything else in the API — the `notes` " +
    "context allows only 10 requests per 10-second window, so throttle bulk note-writing.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      required: true,
      hint: "The contact to attach the note to.",
    },
    { key: "subject", label: "Subject", type: "string", hint: "Title for the note." },
    { key: "body", label: "Body", type: "text", hint: "The note's content." },
    {
      key: "isHtml",
      label: "Body is HTML",
      type: "boolean",
      hint: "Render HTML tags in the body in the Follow Up Boss UI, rather than escaping them.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Note id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request("/notes", {
      method: "POST",
      body: compact({
        personId: input.personId,
        subject: input.subject,
        body: input.body,
        isHtml: input.isHtml,
      }),
    });
  },
};

export default createNote;
