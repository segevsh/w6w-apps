import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact } from "../lib/client.ts";

interface Input {
  leadId: string;
  note?: string;
  noteHtml?: string;
  contactId?: string;
  userId?: string;
  activityAt?: string;
}

/**
 * `POST /activity/note/` — log a Note on a Lead.
 *
 * `lead_id` is the only field Close's schema marks required, which matches the
 * model: an activity is always something that happened on an account.
 *
 * ## `note` vs `note_html`
 *
 * Close accepts either. `note` is plain text; `note_html` carries markup and is
 * what the Close UI itself writes. Send one — sending both invites the two to
 * disagree, and Close derives the plain-text `note` from `note_html` when only
 * the latter is given (its own opportunity example shows exactly that round
 * trip: posting `note_html` returns both fields populated).
 *
 * ## Why Note and not Email
 *
 * `POST /activity/email/` exists and is deliberately NOT shipped in this app.
 * That endpoint's `status` field is not a passive label — an email activity
 * created with an outbox status is a request to actually SEND mail through the
 * connected account, so a "log what happened" action and a "send a message"
 * action would be the same call distinguished only by one string. Sending mail
 * deserves its own action with its own explicit, unmistakable naming and its own
 * `idempotent: false` contract; folding it in here as a fourth activity type
 * would make it far too easy to mail a customer by accident. See the README.
 *
 * Not idempotent: each call appends another Note.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "activity",
  title: "Create Note",
  description:
    "Log a Note activity on a Lead. Plain text or HTML. Does not send anything to anyone — it " +
    "records an internal note on the timeline.",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      placeholder: "lead_...",
      hint: "Activities always belong to a Lead.",
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "Plain-text body. Send this OR `noteHtml`, not both.",
    },
    {
      key: "noteHtml",
      label: "Note (HTML)",
      type: "text",
      placeholder: "<body><p>Spoke with the CFO.</p></body>",
      hint:
        "HTML body, the form the Close UI writes. Close derives the plain-text `note` from it. " +
        "Send this OR `note`, not both.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      placeholder: "cont_...",
      hint: "Attribute the note to a specific person on the Lead.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "user_...",
      hint: "Who the note is from. Defaults to the API key's own user.",
    },
    {
      key: "activityAt",
      label: "Activity at",
      type: "datetime",
      hint:
        "When this actually happened, if not now. Set it when backfilling so the timeline reads " +
        "in the right order.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Activity ID" }],

  execute(input, ctx) {
    if (input.note && input.noteHtml) {
      ctx.log("warn", "both note and noteHtml supplied — Close will store both as given", {});
    }
    return new CloseClient(ctx).request("/activity/note/", {
      method: "POST",
      body: compact({
        lead_id: input.leadId,
        note: input.note,
        note_html: input.noteHtml,
        contact_id: input.contactId,
        user_id: input.userId,
        activity_at: input.activityAt,
      }),
    });
  },
};

export default createNote;
