import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient, toIdList } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  customerId: number;
  customerType?: string;
  businessName?: string;
  contactRole?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPreference?: string;
  notes?: string;
  code?: string;
  defaultSiteId?: number;
  siteIds?: string;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer. Only the fields you set are sent. Pass siteIds to attach sites (the first is the primary site unless a default site is given).",
  idempotent: true,
  params: [
    idParam("customerId", "Customer ID"),
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      options: [{ value: "individual", label: "individual" }, {
        value: "business",
        label: "business",
      }],
      hint: "individual needs contact first and last name; business needs a business name.",
    },
    { key: "businessName", label: "Business name", type: "string" },
    { key: "contactRole", label: "Contact role", type: "string" },
    { key: "contactFirstName", label: "Contact first name", type: "string" },
    { key: "contactLastName", label: "Contact last name", type: "string" },
    { key: "contactEmail", label: "Contact email", type: "string" },
    { key: "contactPhone", label: "Contact phone", type: "string" },
    { key: "contactPreference", label: "Contact preference", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "code",
      label: "Code",
      type: "string",
      hint: "An alphanumeric code that uniquely identifies the customer.",
    },
    optionalIdParam("defaultSiteId", "Default site ID", "The primary site of the customer."),
    {
      key: "siteIds",
      label: "Site IDs",
      type: "string",
      hint: "Comma-separated site ids to attach to the customer.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated customer" },
  ],

  execute(input, ctx) {
    const body = compact({
      customer_type: input.customerType,
      business_name: input.businessName,
      contact_role: input.contactRole,
      contact_first_name: input.contactFirstName,
      contact_last_name: input.contactLastName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      contact_preference: input.contactPreference,
      notes: input.notes,
      code: input.code,
      default_site_id: input.defaultSiteId,
      site_ids: toIdList(input.siteIds, "siteIds"),
    });
    return new GoCanvasClient(ctx).request(`/customers/${encodeId(input.customerId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default customerUpdate;
