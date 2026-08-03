import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  optOutReason?: string;
  updateSource?: "Account" | "Contact";
}

interface ContactResource {
  contact_id?: string;
  email_address?: { address?: string };
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company_name?: string;
  birthday_month?: number;
  birthday_day?: number;
  anniversary?: string;
}

/**
 * Unsubscribe a contact — read, then replace.
 *
 * There is no dedicated unsubscribe endpoint on the V3 API for a normal
 * integration. (`/v3/partner/accounts/{id}/contacts/unsubscribe` exists but is
 * a Technology Partner surface for managing *client accounts*, not the same
 * thing.) The vendor's documented way to opt somebody out is a plain
 * `PUT /v3/contacts/{contact_id}` carrying
 * `email_address.permission_to_send: "unsubscribed"`.
 *
 * That PUT is a full replace, and its documented behaviour is that any
 * top-level property left out is **overwritten with null**. Doing it naively —
 * PUT `{email_address, update_source}` and nothing else — therefore unsubscribes
 * the contact *and* wipes their name, job title, company and dates. That is
 * almost never what "unsubscribe them" was supposed to mean.
 *
 * So this action does two calls:
 *
 *   1. `GET /v3/contacts/{contact_id}` to read the current record;
 *   2. `PUT /v3/contacts/{contact_id}` echoing every top-level scalar back,
 *      with `permission_to_send` flipped to `unsubscribed`.
 *
 * Sub-resources — list memberships, tags, custom fields, phone numbers,
 * addresses — are deliberately **not** fetched or echoed. The API leaves an
 * omitted sub-resource untouched, so round-tripping them would add cost and
 * risk for no gain.
 *
 * `update_source` defaults to `Contact`, matching the vendor's own example:
 * an opt-out is the contact's decision even when a workflow is what recorded
 * it. Set it to `Account` only if the account is unsubscribing them on its own
 * initiative.
 *
 * This is a one-way door for the account. Only the contact can undo it, by
 * confirming a resubscribe email that `PUT /v3/contacts/resubscribe/{id}` sends
 * — and Constant Contact allows exactly one such email per contact.
 *
 * `idempotent: true` — unsubscribing an already-unsubscribed contact is a
 * no-op.
 */
const unsubscribeContact: ActionDefinition<Input> = {
  key: "unsubscribe-contact",
  type: "perform",
  resource: "contact",
  title: "Unsubscribe Contact",
  description:
    "Opt a contact out of email. Reads the contact first so the required full-replace PUT does not blank their other fields.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "optOutReason",
      label: "Opt-out reason",
      type: "string",
      validation: { maxLength: 255 },
      hint: "Free text stored against the opt-out.",
    },
    {
      key: "updateSource",
      label: "Update source",
      type: "select",
      default: "Contact",
      hint:
        "`Contact` when the person asked to be removed (the usual case); `Account` when you are removing them.",
      options: [
        { value: "Contact", label: "Contact" },
        { value: "Account", label: "Account" },
      ],
    },
  ],
  output: [
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "object", label: "Email address with the new permission" },
  ],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const path = `/contacts/${encodeURIComponent(input.contactId)}`;

    const current = await client.request<ContactResource>(path);
    const address = current?.email_address?.address;
    if (!address) {
      throw new Error(
        `Constant Contact contact ${input.contactId} has no email address to unsubscribe`,
      );
    }
    ctx.log("info", "unsubscribing contact", { contactId: input.contactId });

    const email: Record<string, unknown> = {
      address,
      permission_to_send: "unsubscribed",
    };
    if (input.optOutReason !== undefined) email.opt_out_reason = input.optOutReason;

    // Echo the scalars back so the full-replace PUT does not null them.
    const body: Record<string, unknown> = {
      email_address: email,
      update_source: input.updateSource ?? "Contact",
    };
    if (current.first_name !== undefined) body.first_name = current.first_name;
    if (current.last_name !== undefined) body.last_name = current.last_name;
    if (current.job_title !== undefined) body.job_title = current.job_title;
    if (current.company_name !== undefined) body.company_name = current.company_name;
    if (current.birthday_month !== undefined) body.birthday_month = current.birthday_month;
    if (current.birthday_day !== undefined) body.birthday_day = current.birthday_day;
    if (current.anniversary !== undefined) body.anniversary = current.anniversary;

    return client.request(path, { method: "PUT", body });
  },
};

export default unsubscribeContact;
