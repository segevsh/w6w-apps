import type { ActionDefinition } from "@w6w/types";
import { compact, MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import type { MailjetContact } from "./list-contacts.ts";

interface Input {
  email: string;
  name?: string;
  isExcludedFromCampaigns?: boolean;
}

/**
 * Create a contact.
 *
 * `Email` is the contact's identity in Mailjet and is **immutable** — there is no
 * update path that changes it, which is why `update-contact` does not offer one.
 * Creating a contact whose email already exists returns an error rather than
 * updating in place; use `manage-contact-lists` (or `manage-many-contacts` for
 * bulk) when the intent is upsert-and-subscribe, since those accept an existing
 * address without complaint.
 *
 * `IsExcludedFromCampaigns` is Mailjet's account-wide suppression flag, not a
 * per-list one: setting it keeps the contact out of every marketing campaign on
 * this API key while still allowing transactional sends. It is a create-time
 * option here because importing an already-unsubscribed contact without it would
 * mail someone who has opted out.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  /** A duplicate Email is an error, so a retry does not reproduce the first call's result. */
  idempotent: false,
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact (POST /v3/REST/contact). The email is the contact's permanent identity — " +
    "a duplicate is an error, not an update.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "isExcludedFromCampaigns",
      label: "Exclude from campaigns",
      type: "boolean",
      hint: "Account-wide marketing suppression. Transactional sends still reach them.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Contact" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetContact>>("/contact", {
      method: "POST",
      body: compact({
        Email: input.email,
        Name: input.name,
        IsExcludedFromCampaigns: input.isExcludedFromCampaigns,
      }),
    });
  },
};

export default createContact;
