import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";

/**
 * `POST /crm/v2/tenant/{tenant}/customers`. The spec requires `name`,
 * `address` AND a non-empty `locations` array (each with its own name and
 * address), so one customer cannot exist without a service location. This
 * action creates a single location that shares the bill-to address.
 */
interface Input {
  name: string;
  type?: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  locationName?: string;
  phone?: string;
  mobilePhone?: string;
  email?: string;
  tagTypeIds?: string;
  doNotMail?: boolean;
  doNotService?: boolean;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create a Customer",
  description:
    "Create a customer with one service location at the same address, and optional contacts.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Residential", value: "Residential" },
        { label: "Commercial", value: "Commercial" },
      ],
    },
    { key: "street", label: "Street", type: "string", required: true },
    { key: "unit", label: "Unit", type: "string" },
    { key: "city", label: "City", type: "string", required: true },
    { key: "state", label: "State", type: "string", required: true },
    { key: "zip", label: "Zip", type: "string", required: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      default: "USA",
      hint: "ServiceTitan requires a country; `USA` or `Canada`.",
    },
    {
      key: "locationName",
      label: "Location name",
      type: "string",
      hint: "Name of the service location. Defaults to the customer's name.",
    },
    { key: "phone", label: "Phone", type: "string", hint: "Added as a Phone contact." },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "tagTypeIds",
      label: "Tag type IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated tag type ids to apply.",
    },
    { key: "doNotMail", label: "Do not mail", type: "boolean", advanced: true },
    { key: "doNotService", label: "Do not service", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Bill-to address" },
  ],

  async execute(input, ctx) {
    const address = compact({
      street: input.street,
      unit: input.unit,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
    });
    const contacts = [
      input.phone ? { type: "Phone", value: input.phone } : undefined,
      input.mobilePhone ? { type: "MobilePhone", value: input.mobilePhone } : undefined,
      input.email ? { type: "Email", value: input.email } : undefined,
    ].filter(Boolean);
    return await new ServiceTitanClient(ctx).request("crm", "/customers", {
      method: "POST",
      body: compact({
        name: input.name,
        type: input.type,
        address,
        locations: [{ name: input.locationName || input.name, address }],
        contacts,
        tagTypeIds: idList(input.tagTypeIds),
        doNotMail: input.doNotMail,
        doNotService: input.doNotService,
      }),
    });
  },
};

export default customerCreate;
