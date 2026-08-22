import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_STATUSES, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /contacts/{contact_id}/conversations` — verified against Front's own
 * OpenAPI document (`list-contact-conversations`).
 *
 * Everything one customer has ever written, across every channel their handles
 * cover. This is the call that makes Front worth integrating rather than
 * scraping a mailbox: the history follows the *person*, so an email thread and
 * an SMS from the same customer land in one list.
 *
 * Because the contact can be named by handle alias (`alt:email:…`), a workflow
 * that has an address and wants "has this person contacted us before" needs one
 * request, not a search.
 */
const action: ActionDefinition = {
  key: "contact-conversation-list",
  type: "read",
  resource: "contact",
  title: "List a contact's conversations",
  description:
    "Every conversation with one person, across all their handles and channels. Accepts an " +
    "`alt:email:…` alias, so an address is enough.",
  params: [
    {
      key: "contactId",
      label: "Contact ID or Handle Alias",
      type: "string",
      required: true,
      default: "",
      placeholder: "alt:email:ada@example.com",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: CONVERSATION_STATUSES,
      hint: "Leave empty for every status.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created At" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contactId = String(p.contactId ?? "");
    if (!contactId) throw new Error("`contactId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const statuses = Array.isArray(p.statuses) ? p.statuses as string[] : [];

    return await new FrontClient(ctx).requestAll(
      `/contacts/${encodeURIComponent(contactId)}/conversations`,
      { q: { statuses } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
