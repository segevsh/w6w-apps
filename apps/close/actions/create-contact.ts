import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  leadId: string;
  name?: string;
  title?: string;
  emails?: unknown[] | null;
  phones?: unknown[] | null;
  urls?: unknown[] | null;
  timezone?: string;
  customFields?: Record<string, unknown> | null;
}

/**
 * `POST /contact/` — create a Contact on a Lead.
 *
 * `lead_id` is required in practice, not by convention: a Contact cannot exist
 * outside a Lead in Close's model — "these other objects _must_ be children of a
 * Lead". If you are creating a company and its first person together, nesting
 * `contacts` in Create Lead is one round trip instead of two.
 *
 * Emails, phones and urls are arrays of typed objects, matching the
 * `{email, type}` / `{phone, type}` shapes in Close's schema, so a Contact can
 * carry an office and a mobile number without either being privileged.
 *
 * Not idempotent: a retry creates a second Contact with the same details.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a Contact on a Lead, with typed email addresses, phone numbers and URLs.",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      placeholder: "lead_...",
      hint: "A Contact must belong to a Lead — Close has no free-standing contacts.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "title", label: "Title", type: "string", placeholder: "Sr. Vice President" },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint:
        'e.g. `[{"email": "gob@example.com", "type": "office"}]`. Types: `office`, `home`, `other`.',
    },
    {
      key: "phones",
      label: "Phones",
      type: "json",
      hint:
        'e.g. `[{"phone": "+18004445555", "type": "office"}]`. Types: `office`, `mobile`, `home`, `direct`, `fax`, `other`.',
    },
    {
      key: "urls",
      label: "URLs",
      type: "json",
      hint: 'e.g. `[{"url": "https://example.com", "type": "url"}]`.',
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "America/Denver",
      hint: "IANA timezone name, used by Close to show local time for this person.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        lead_id: input.leadId,
        name: input.name,
        title: input.title,
        emails: input.emails ?? undefined,
        phones: input.phones ?? undefined,
        urls: input.urls ?? undefined,
        timezone: input.timezone,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request("/contact/", { method: "POST", body });
  },
};

export default createContact;
