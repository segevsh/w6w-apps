import type { ActionDefinition } from "@w6w/types";
import {
  MailjetClient,
  type MailjetEnvelope,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  contactsList?: number;
  campaign?: number;
  isExcludedFromCampaigns?: boolean;
}

/** A v3 `contact` object. Field names verified against dev.mailjet.com's reference. */
export interface MailjetContact {
  ID?: number;
  Email?: string;
  Name?: string;
  CreatedAt?: string;
  LastUpdateAt?: string;
  LastActivityAt?: string;
  DeliveredCount?: number;
  IsExcludedFromCampaigns?: boolean;
  ExclusionFromCampaignsUpdatedAt?: string;
  IsOptInPending?: boolean;
  IsSpamComplaining?: boolean;
  UnsubscribedAt?: string;
  UnsubscribedBy?: string;
}

/**
 * List contacts on the credential's own contacts database.
 *
 * "Own" is load-bearing on Mailjet in a way it is not for most vendors here: per
 * the account-management guide, "Each API key will have its own dedicated
 * database for contacts, lists, newsletters and statistics. The contacts and
 * lists will not be shared between API keys (including the main API key)." A
 * contact created under a sub-account key is invisible to the master key. If a
 * workflow's contacts appear to have vanished, the credential is the first thing
 * to check, not the filters.
 *
 * `contactsList` narrows to one list's members, which is the filter most
 * automation actually wants — Mailjet's default is every contact the key has
 * ever seen, including addresses auto-created by a transactional send (the send
 * docs warn: "If you send an email to a contact, which is not registered in
 * Mailjet, the system will automatically create and save it").
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts (GET /v3/REST/contact). Walks one page — pass `limit + offset` back as the " +
    "next `offset`. Scoped to this API key's own contacts database.",
  params: [
    {
      key: "contactsList",
      label: "Contact list ID",
      type: "number",
      hint: "Restrict to members of one list.",
    },
    {
      key: "campaign",
      label: "Campaign ID",
      type: "number",
      hint: "Restrict to contacts a given campaign was sent to.",
    },
    {
      key: "isExcludedFromCampaigns",
      label: "Excluded from campaigns",
      type: "boolean",
      hint: "True lists only unsubscribed/excluded contacts; false only active ones.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "Data", type: "array", label: "Contacts" },
    { key: "Count", type: "number", label: "Count" },
    { key: "Total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetContact>>("/contact", {
      query: {
        ...pageQuery(input),
        ContactsList: input.contactsList,
        Campaign: input.campaign,
        IsExcludedFromCampaigns: input.isExcludedFromCampaigns,
      },
    });
  },
};

export default listContacts;
