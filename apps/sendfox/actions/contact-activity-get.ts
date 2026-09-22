import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /contacts/{id}/activity` — a contact's email history.
 *
 * The response has two halves, and they are shaped differently:
 *
 *  - `contact` — the contact-level engagement summary: `last_sent_at`,
 *    `last_opened_at`, `last_clicked_at`, `unsubscribed_at`, `bounced_at`.
 *  - `deliverables.data` — a **paginated** list of the individual emails sent to
 *    this contact (campaign title and id, and the timestamps each one reached),
 *    i.e. a page object nested one level down rather than at the top level.
 *
 * This is the only endpoint in the covered surface that carries a per-contact
 * send history, so it is what a workflow reads to answer "did this person ever
 * open what we sent them".
 */
interface Input {
  id: number;
}

const contactActivityGet: ActionDefinition<Input> = {
  key: "contact-activity-get",
  type: "read",
  resource: "contact",
  title: "Get Contact Activity",
  description: "Read a contact's engagement summary and the emails sent to them.",
  params: [
    idParam("id", "Contact", "Contact id whose activity to read."),
  ],
  output: [
    { key: "contact", type: "object", label: "Engagement summary (last sent/opened/clicked)" },
    { key: "deliverables", type: "object", label: "Paginated list of emails sent to this contact" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/contacts/${encodeId(input.id)}/activity`);
  },
};

export default contactActivityGet;
