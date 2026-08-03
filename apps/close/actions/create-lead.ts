import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  name?: string;
  url?: string;
  description?: string;
  statusId?: string;
  contacts?: unknown[] | null;
  addresses?: unknown[] | null;
  customFields?: Record<string, unknown> | null;
}

/**
 * `POST /lead/` — create a Lead.
 *
 * A Lead in Close is the company/account object: contacts, opportunities, tasks
 * and activities all hang off one. Close's own docs note it plays the role of
 * both "lead" and "account" in other CRMs' vocabulary.
 *
 * Two things the create page is explicit about, both reflected here:
 *
 *   - **Contacts and addresses may be NESTED** in the create body, but
 *     "activities, tasks, and opportunities must be posted separately".
 *   - **`status` and `status_id` are mutually exclusive** — "Post either
 *     `status` or `status_id` (but not both)". This action exposes only
 *     `status_id`, which Close recommends "so that users can rename statuses in
 *     the UI without breaking your implementation". Omit it and Close applies
 *     the organization's default (first) status.
 *
 * Not idempotent: Close mints a new lead id per call and offers no idempotency
 * key on this endpoint, so a retry creates a duplicate.
 */
const createLead: ActionDefinition<Input> = {
  key: "create-lead",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    "Create a Lead, optionally with contacts and addresses nested in. Opportunities, tasks and " +
    "activities must be created separately.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Company or organization name, e.g. `Bluth Company`.",
    },
    { key: "url", label: "URL", type: "string", placeholder: "https://example.com" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      placeholder: "stat_...",
      hint:
        "Lead status id from the List Statuses action. Omit to use the organization's default " +
        "status. Prefer the id over the label so renaming a status in the UI cannot break this.",
    },
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      hint: 'Array of nested contacts, e.g. `[{"name": "Gob", "title": "SVP", ' +
        '"emails": [{"email": "gob@example.com", "type": "office"}]}]`.',
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      hint: 'Array of addresses, e.g. `[{"address_1": "747 Howard St", "city": "San Francisco", ' +
        '"state": "CA", "zipcode": "94103", "country": "US", "label": "business"}]`.',
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "contact_ids", type: "array", label: "Ids of any nested contacts created" },
  ],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        name: input.name,
        url: input.url,
        description: input.description,
        status_id: input.statusId,
        contacts: input.contacts ?? undefined,
        addresses: input.addresses ?? undefined,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request("/lead/", { method: "POST", body });
  },
};

export default createLead;
