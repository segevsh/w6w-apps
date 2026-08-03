import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `PATCH /v1/contacts/{id}` — edit a contact's attributes.
 *
 * ## A sparse PATCH, deliberately
 *
 * Only the fields the caller actually filled in are sent — `compact` drops the
 * rest. That matters more than usual on a contact record: the attribute set is
 * wide, and a client that helpfully sent every key would blank a phone number
 * or an address the workflow never intended to touch, on every run.
 *
 * ## Tags are not editable here
 *
 * The spec's update schema does declare a `relationships.tags` array — but note
 * *where*: it sits as a sibling of `data`, not inside it, which is not what
 * JSON:API's own update semantics describe and not a shape this app is willing
 * to guess the behaviour of. There are purpose-built relationship endpoints
 * that are unambiguous, so tags go through `contact-tag-add`,
 * `contact-tag-remove` and `contact-tag-replace` instead. That also keeps the
 * additive and destructive operations visibly separate, which a single
 * `tags: [...]` field on an update form would not.
 *
 * ## `external_user_id` is available here, unlike on create
 *
 * The spec annotates it *"Supported once contact is granted an offer or makes a
 * purchase"* — a precondition an existing contact can meet, so it is offered on
 * this action and not on `contact-create`.
 */
interface Input {
  id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  businessNumber?: string;
  externalUserId?: string;
  subscribed?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressZip?: string;
  customFields?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact. Only the fields you fill in are sent, so blank fields are left as they " +
    "are rather than cleared.",
  idempotent: true,
  params: [
    idParam("Contact ID", "`contact-list` returns the ids."),
    { key: "name", label: "Name", type: "string", row: "who" },
    { key: "email", label: "Email", type: "string", row: "who" },
    { key: "phoneNumber", label: "Phone number", type: "string", row: "phone" },
    { key: "businessNumber", label: "Business number", type: "string", row: "phone" },
    {
      key: "externalUserId",
      label: "External user ID",
      type: "string",
      advanced: true,
      hint: "Your own id for this person. Kajabi: *supported once the contact is granted an " +
        "offer or makes a purchase* — setting it earlier has no effect.",
    },
    { key: "subscribed", label: "Subscribed", type: "boolean" },
    { key: "addressLine1", label: "Address line 1", type: "string", advanced: true },
    { key: "addressLine2", label: "Address line 2", type: "string", advanced: true },
    { key: "addressCity", label: "City", type: "string", advanced: true, row: "city" },
    { key: "addressState", label: "State", type: "string", advanced: true, row: "city" },
    { key: "addressCountry", label: "Country", type: "string", advanced: true, row: "geo" },
    { key: "addressZip", label: "Postal code", type: "string", advanced: true, row: "geo" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "string",
      ui: "textarea",
      advanced: true,
      placeholder: '{"custom_1": "Renewed"}',
      hint: "JSON object over `custom_1`…`custom_3`. `custom-field-list` shows what the site " +
        "has defined them as.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    const attributes = compact({
      name: input.name,
      email: input.email,
      phone_number: input.phoneNumber,
      business_number: input.businessNumber,
      external_user_id: input.externalUserId,
      subscribed: input.subscribed,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      address_city: input.addressCity,
      address_state: input.addressState,
      address_country: input.addressCountry,
      address_zip: input.addressZip,
      ...(jsonObject(input.customFields, "Custom fields") ?? {}),
    });

    return new KajabiClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: { data: { id: String(input.id), type: "contacts", attributes } },
    });
  },
};

export default contactUpdate;
