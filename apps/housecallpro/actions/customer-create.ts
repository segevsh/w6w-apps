import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /customers` — create a customer, optionally with their first addresses.
 *
 * Every field on this endpoint is optional in the reference, including the name
 * and the email, so nothing is marked required here that the API does not
 * require. `addresses` is the only nested structure and it takes
 * `{street, street_line_2, city, state, zip, country}` per entry.
 */
interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  mobileNumber?: string;
  homeNumber?: string;
  workNumber?: string;
  notificationsEnabled?: boolean;
  leadSource?: string;
  notes?: string;
  tags?: string[] | string;
  addresses?: unknown;
  companyId?: string;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer, optionally with one or more addresses.",
  // Housecall Pro accepts no idempotency key of any kind on this endpoint, and
  // there is no natural unique field — two calls with the same email create two
  // customers. A retry would duplicate the record.
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "mobileNumber", label: "Mobile number", type: "string" },
    { key: "homeNumber", label: "Home number", type: "string" },
    { key: "workNumber", label: "Work number", type: "string" },
    {
      key: "notificationsEnabled",
      label: "Notifications enabled",
      type: "boolean",
      hint: "Whether the customer receives Housecall Pro notifications.",
    },
    { key: "leadSource", label: "Lead source", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names.",
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      hint:
        'Array of {street, street_line_2, city, state, zip, country}, e.g. [{"street":"1 Main St",' +
        '"city":"Austin","state":"TX","zip":"78701","country":"US"}].',
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "addresses", type: "array", label: "Addresses" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating customer", { email: input.email });
    return new HousecallClient(ctx).json("/customers", {
      method: "POST",
      companyId: input.companyId,
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        company: input.company,
        mobile_number: input.mobileNumber,
        home_number: input.homeNumber,
        work_number: input.workNumber,
        notifications_enabled: input.notificationsEnabled,
        lead_source: input.leadSource,
        notes: input.notes,
        tags: toList(input.tags),
        addresses: asOptionalJson<unknown[]>(input.addresses, "Addresses"),
      }),
    });
  },
};

export default customerCreate;
