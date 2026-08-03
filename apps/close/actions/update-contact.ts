import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  contactId: string;
  name?: string;
  title?: string;
  emails?: unknown[] | null;
  phones?: unknown[] | null;
  urls?: unknown[] | null;
  timezone?: string;
  leadId?: string;
  customFields?: Record<string, unknown> | null;
}

/**
 * `PUT /contact/{id}/` — update a Contact.
 *
 * A partial update, like every Close PUT. One sharp edge worth stating at the
 * form: `emails`, `phones` and `urls` are whole-list REPLACEMENTS, not merges.
 * Sending one email address drops any others already on the Contact. Read the
 * Contact first and send the full list if you mean to append.
 *
 * `lead_id` is settable here, which is how a person moves from one account to
 * another.
 *
 * Idempotent: the same body applied twice leaves the same Contact.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a Contact. Partial update, except that emails, phones and urls replace the existing " +
    "list wholesale rather than merging into it.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      placeholder: "cont_...",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "title", label: "Title", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: "REPLACES the existing list. Send every address you want to keep.",
    },
    {
      key: "phones",
      label: "Phones",
      type: "json",
      hint: "REPLACES the existing list. Send every number you want to keep.",
    },
    {
      key: "urls",
      label: "URLs",
      type: "json",
      hint: "REPLACES the existing list.",
    },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/Denver" },
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      placeholder: "lead_...",
      hint: "Set this to move the Contact to a different Lead.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        name: input.name,
        title: input.title,
        emails: input.emails ?? undefined,
        phones: input.phones ?? undefined,
        urls: input.urls ?? undefined,
        timezone: input.timezone,
        lead_id: input.leadId,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request(`/contact/${encodeURIComponent(input.contactId)}/`, {
      method: "PUT",
      body,
    });
  },
};

export default updateContact;
