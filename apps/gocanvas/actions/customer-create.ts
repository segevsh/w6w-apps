import type { ActionDefinition } from "@w6w/types";
import { compact, GoCanvasClient } from "../lib/client.ts";

interface Input {
  customerType: string;
  businessName?: string;
  contactRole?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPreference?: string;
  notes?: string;
  code?: string;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer. customer_type is required: an individual needs a first and last name, a business needs a business name.",
  idempotent: false,
  params: [
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      required: true,
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
  ],
  output: [
    { key: "data", type: "object", label: "The created customer" },
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
    });
    if (input.customerType === "business" && !input.businessName) {
      throw new Error("a business customer needs a business name");
    }
    if (input.customerType === "individual" && !(input.contactFirstName && input.contactLastName)) {
      throw new Error("an individual customer needs a contact first and last name");
    }
    return new GoCanvasClient(ctx).request("/customers", { method: "POST", body });
  },
};

export default customerCreate;
