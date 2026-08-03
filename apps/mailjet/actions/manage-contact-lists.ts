import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";

/**
 * Mailjet's four subscription verbs, quoted from the contacts guide. The
 * `addforce` / `addnoforce` distinction is the one that matters and the one that
 * gets misused: only `addnoforce` respects an existing unsubscribe.
 */
export const SUBSCRIPTION_ACTIONS = [
  {
    value: "addnoforce",
    label: "Add (respect existing unsubscribe)",
  },
  {
    value: "addforce",
    label: "Add and force-resubscribe",
  },
  { value: "unsub", label: "Unsubscribe" },
  { value: "remove", label: "Remove from list" },
] as const;

interface Input {
  contact: string;
  listId?: number;
  action?: string;
  contactsLists?: Array<{ ListID: number; Action: string }>;
}

/**
 * Subscribe, unsubscribe or remove **one** contact across one or more lists.
 *
 * ## `addforce` will resurrect an unsubscribe — read this before choosing
 *
 * Mailjet's own definitions:
 *
 *   - `addforce` — "adds the contact and resets the unsub status to false"
 *   - `addnoforce` — "adds the contact and does not change the subscription
 *     status of the contact"
 *   - `unsub` — "unsubscribes a contact from the list"
 *   - `remove` — "removes the contact from the list"
 *
 * `addforce` silently re-subscribes somebody who previously opted out. That is
 * occasionally what you want (a genuine re-opt-in, captured elsewhere) and is
 * usually a compliance problem. **This action therefore defaults to
 * `addnoforce`**, the safe verb, rather than to whatever the vendor lists first.
 * Choosing to override an unsubscribe should be a decision someone typed, not a
 * default they inherited.
 *
 * `remove` and `unsub` are also genuinely different: `unsub` leaves the
 * membership in place flagged as unsubscribed (so a later `addnoforce` will not
 * quietly re-mail them), while `remove` deletes the membership and with it the
 * record that they ever opted out.
 *
 * ## Shape
 *
 * The single-contact endpoint takes `{"ContactsLists": [{"ListID", "Action"}]}`
 * — note **`Action` is capitalised here**, while the bulk endpoint
 * (`manage-many-contacts`) takes a lowercase top-level `action`. That
 * inconsistency is Mailjet's, and it is the reason these are separate actions
 * rather than one with a mode switch: a shared implementation would have to
 * silently re-case a caller's field and would fail confusingly when it guessed
 * wrong.
 *
 * Pass either `listId` + `action` for the common single-list case, or
 * `contactsLists` for several lists in one call.
 */
const manageContactLists: ActionDefinition<Input> = {
  key: "manage-contact-lists",
  type: "perform",
  /** Sets subscription state to a named value; a retry lands on the same state. */
  idempotent: true,
  resource: "contact",
  title: "Manage Contact's List Subscriptions",
  description: "Subscribe, unsubscribe or remove one contact across lists " +
    "(POST /v3/REST/contact/{id_or_email}/managecontactslists). Defaults to `addnoforce`, which " +
    "respects an existing unsubscribe — `addforce` overrides it.",
  params: [
    {
      key: "contact",
      label: "Contact ID or email",
      type: "string",
      required: true,
      hint: "Either form works: `1234` or `person@example.com`.",
    },
    {
      key: "listId",
      label: "Contact list ID",
      type: "number",
      hint: "For the single-list case. Ignored when `contactsLists` is supplied.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "addnoforce",
      options: [...SUBSCRIPTION_ACTIONS],
      hint: "`addforce` resets a previous unsubscribe to subscribed — use deliberately.",
    },
    {
      key: "contactsLists",
      label: "Contact lists",
      type: "json",
      hint: 'For several lists at once: JSON array of `{"ListID": 123, "Action": "addnoforce"}`. ' +
        "Note the capitalised `Action` — the bulk action uses lowercase.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Result" },
    { key: "Count", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    const contactsLists = input.contactsLists ?? [
      { ListID: input.listId as number, Action: input.action ?? "addnoforce" },
    ];
    return client.v3<MailjetEnvelope>(
      `/contact/${encodeURIComponent(input.contact)}/managecontactslists`,
      { method: "POST", body: { ContactsLists: contactsLists } },
    );
  },
};

export default manageContactLists;
