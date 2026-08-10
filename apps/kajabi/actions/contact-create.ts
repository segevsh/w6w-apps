import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, KajabiClient, resourceIdentifier } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/contacts` — add someone to the audience.
 *
 * ## The site is a relationship, not a filter
 *
 * This is the one place `siteId` is **required** and is not a `filter[…]`. The
 * spec's request schema requires all three of `type`, `attributes` and
 * `relationships`, and `relationships.site.data` requires `{ id, type }` — a
 * contact cannot exist without a site to belong to. That is why the param is
 * mandatory here while it is optional everywhere else in this app.
 *
 * ## `external_user_id` does not work yet on a new contact
 *
 * The attribute exists on `contacts_attributes`, but the spec annotates it:
 * *"Supported once contact is granted an offer or makes a purchase"*. So it is
 * deliberately **not** offered on this action — a field that silently does
 * nothing at creation time is worse than an absent one. Set it with
 * `contact-update` after the contact has an offer.
 *
 * ## Custom fields are a JSON bag, on purpose
 *
 * `custom_1`, `custom_2` and `custom_3` are annotated *"Support depends on
 * custom fields of a site"* — what they mean differs per site, and only three
 * exist. Rather than three unlabelled boxes, they go through the
 * `customFields` JSON param, and `custom-field-list` is what tells you what
 * the site has defined them as.
 */
interface Input {
  siteId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  businessNumber?: string;
  subscribed?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressZip?: string;
  customFields?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact on a site. Kajabi requires the site relationship, so the Site ID is " +
    "mandatory here.",
  idempotent: false,
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      hint: "Required — a contact belongs to a site. `site-list` returns the ids.",
    },
    { key: "name", label: "Name", type: "string", required: true, row: "who" },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      row: "who",
      placeholder: "person@example.com",
    },
    { key: "phoneNumber", label: "Phone number", type: "string", row: "phone" },
    { key: "businessNumber", label: "Business number", type: "string", row: "phone" },
    {
      key: "subscribed",
      label: "Subscribed",
      type: "boolean",
      hint: "Marketing email consent. Leave unset to accept Kajabi's default rather than " +
        "asserting consent this workflow may not have.",
    },
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
      placeholder: '{"custom_1": "Referred by a friend"}',
      hint: "JSON object. Kajabi exposes `custom_1`…`custom_3`, and what each means is defined " +
        "per site — `custom-field-list` shows the site's definitions.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    const attributes = compact({
      name: input.name,
      email: input.email,
      phone_number: input.phoneNumber,
      business_number: input.businessNumber,
      subscribed: input.subscribed,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      address_city: input.addressCity,
      address_state: input.addressState,
      address_country: input.addressCountry,
      address_zip: input.addressZip,
      ...(jsonObject(input.customFields, "Custom fields") ?? {}),
    });

    return new KajabiClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        data: {
          type: "contacts",
          attributes,
          relationships: {
            site: { data: resourceIdentifier(input.siteId, "sites") },
          },
        },
      },
    });
  },
};

export default contactCreate;
