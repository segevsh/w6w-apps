import type { ActionDefinition } from "@w6w/types";
import { asObject, ChargebeeClient } from "../lib/client.ts";

interface Input {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferredCurrencyCode?: string;
  autoCollection?: string;
  netTermDays?: number;
  locale?: string;
  billingAddress?: unknown;
  metaData?: unknown;
}

/**
 * `POST /customers` — create a customer.
 *
 * Every parameter is optional, including `id`: "You have the option to specify
 * this value when creating a customer. If not specified, Chargebee automatically
 * generates a unique identifier."
 *
 * `billing_address` is a nested object and goes on the wire in bracket form,
 * exactly as Chargebee's own sample writes it:
 *
 *   `-d "billing_address[line1]"="PO Box 9999" -d "billing_address[city]"="Walnut"`
 *
 * `meta_data` is different again — it is documented as a `jsonobject` and the
 * official clients JSON-*stringify* it into a single form value rather than
 * expanding it into brackets. `lib/client.ts` carries that as an explicit
 * `JSON_ENCODED_KEYS` set so the difference is stated, not accidental.
 *
 * ## Payment details are deliberately absent
 *
 * This endpoint can also create a `card` or `bank_account` in the same call, and
 * this action does not expose that. Chargebee's own page says why: "Although
 * this operation supports creation of a customer with a payment source, it is
 * recommended to use one of the Payment Source APIs to capture payment source
 * details instead of using this operation. This way, even if payment source
 * creation fails due to errors at the payment gateway, the customer resource can
 * still be created successfully." Raw PAN data also has no business crossing a
 * workflow engine.
 *
 * Not idempotent from this App's point of view. Chargebee marks the endpoint
 * "Idempotency Supported" — via a `chargebee-idempotency-key` request header —
 * but this App does not send one, so a retry with no `id` creates a second
 * customer. Supplying `id` yourself is the reliable way to make a retry safe:
 * the second call then fails as a duplicate instead of silently doubling.
 */
const createCustomer: ActionDefinition<Input> = {
  key: "create-customer",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer, optionally with a billing address and metadata. Payment details are " +
    "deliberately not accepted here — use Chargebee's payment source APIs for those.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Customer ID",
      type: "string",
      hint:
        "Optional. Chargebee generates one when omitted. Supplying your own makes a retry safe — " +
        "the duplicate fails instead of creating a second customer.",
      validation: { maxLength: 50 },
    },
    { key: "firstName", label: "First name", type: "string", validation: { maxLength: 150 } },
    { key: "lastName", label: "Last name", type: "string", validation: { maxLength: 150 } },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Chargebee sends its configured email notifications here.",
      validation: { maxLength: 70 },
    },
    { key: "phone", label: "Phone", type: "string", validation: { maxLength: 50 } },
    { key: "company", label: "Company", type: "string", validation: { maxLength: 250 } },
    {
      key: "preferredCurrencyCode",
      label: "Preferred currency",
      type: "string",
      placeholder: "USD",
      hint: "ISO 4217 three-letter code.",
    },
    {
      key: "autoCollection",
      label: "Auto collection",
      type: "select",
      options: [
        { value: "on", label: "On — charge automatically" },
        { value: "off", label: "Off — invoice and collect manually" },
      ],
      hint: "Falls back to the site default when omitted.",
    },
    {
      key: "netTermDays",
      label: "Net term days",
      type: "number",
      hint:
        "Days after invoice date that payment is due. Only meaningful with auto collection off.",
      validation: { integer: true, min: 0 },
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "fr-CA" },
    {
      key: "billingAddress",
      label: "Billing address",
      type: "json",
      hint:
        'JSON object, e.g. `{"line1": "PO Box 9999", "city": "Walnut", "state": "California", ' +
        '"zip": "91789", "country": "US"}`. Sent as `billing_address[line1]`, `billing_address[city]`, ...',
    },
    {
      key: "metaData",
      label: "Metadata",
      type: "json",
      hint:
        'JSON object of your own data, e.g. `{"crm_id": "abc123"}`. Sent as a single JSON-encoded ' +
        "`meta_data` value, which is how Chargebee reads it. 65 535 character limit.",
    },
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "card", type: "object", label: "Card, if one was created" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request("/customers", {
      form: {
        id: input.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company,
        preferred_currency_code: input.preferredCurrencyCode,
        auto_collection: input.autoCollection,
        net_term_days: input.netTermDays,
        locale: input.locale,
        billing_address: asObject(input.billingAddress, "Billing address"),
        meta_data: asObject(input.metaData, "Metadata"),
      },
    });
  },
};

export default createCustomer;
