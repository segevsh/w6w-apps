import type { ActionDefinition } from "@w6w/types";
import { asObject, ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferredCurrencyCode?: string;
  autoCollection?: string;
  netTermDays?: number;
  locale?: string;
  invoiceNotes?: string;
  metaData?: unknown;
}

/**
 * `POST /customers/{customer-id}` — update a customer.
 *
 * A POST, not a PUT or PATCH. Chargebee uses only two verbs, as its own docs
 * state: "`GET` — Read operations ... `POST` — Write operations, such as
 * creating, updating, or deleting resources." There is no PUT anywhere in the v2
 * surface.
 *
 * ## What is NOT here, and why
 *
 * `billing_address` is absent from this action even though it is a valid
 * parameter of the endpoint, because Chargebee treats it as a REPLACEMENT rather
 * than a merge and documents a dedicated operation for it
 * (`POST /customers/{id}/update_billing_info`). Offering a half-filled address
 * here is a good way to silently drop someone's postcode.
 *
 * Only fields you actually supply are sent — `lib/client.ts` drops empty, null
 * and undefined values — so an unfilled optional field cannot blank a stored
 * value. The trade-off is that this action cannot CLEAR a field by sending an
 * empty string; that is the safer direction and it is stated in the README.
 *
 * Idempotent: re-sending the same field values converges on the same customer.
 */
const updateCustomer: ActionDefinition<Input> = {
  key: "update-customer",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's contact details, billing preferences or metadata. Only the fields you " +
    "fill in are sent, so blanks never overwrite stored values.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", validation: { maxLength: 150 } },
    { key: "lastName", label: "Last name", type: "string", validation: { maxLength: 150 } },
    { key: "email", label: "Email", type: "string", validation: { maxLength: 70 } },
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
    },
    {
      key: "netTermDays",
      label: "Net term days",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "fr-CA" },
    {
      key: "invoiceNotes",
      label: "Invoice notes",
      type: "text",
      hint: "Carried onto invoices raised for this customer.",
    },
    {
      key: "metaData",
      label: "Metadata",
      type: "json",
      hint:
        "JSON object. Sent as a single JSON-encoded `meta_data` value and REPLACES the stored " +
        "metadata rather than merging into it.",
    },
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "card", type: "object", label: "Primary card, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(
      `/customers/${pathId(input.customerId)}`,
      {
        form: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          preferred_currency_code: input.preferredCurrencyCode,
          auto_collection: input.autoCollection,
          net_term_days: input.netTermDays,
          locale: input.locale,
          invoice_notes: input.invoiceNotes,
          meta_data: asObject(input.metaData, "Metadata"),
        },
      },
    );
  },
};

export default updateCustomer;
