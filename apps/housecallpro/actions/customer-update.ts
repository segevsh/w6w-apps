import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `PUT /customers/{customer_id}` — update customer attributes.
 *
 * The update body is the create body minus `addresses`: an address is added
 * through `POST /customers/{customer_id}/addresses`, not by rewriting the
 * customer. Only the fields sent are changed.
 */
interface Input {
  customerId: string;
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
  companyId?: string;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's attributes. Only the fields you set are sent. Addresses are managed " +
    "separately, with Create Customer Address.",
  // A PUT of the same body twice leaves the same record, so a retry is safe.
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "mobileNumber", label: "Mobile number", type: "string" },
    { key: "homeNumber", label: "Home number", type: "string" },
    { key: "workNumber", label: "Work number", type: "string" },
    { key: "notificationsEnabled", label: "Notifications enabled", type: "boolean" },
    { key: "leadSource", label: "Lead source", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/customers/${encodeId(input.customerId)}`, {
      method: "PUT",
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
      }),
    });
  },
};

export default customerUpdate;
