import type { ActionDefinition } from "@w6w/types";
import { compact, DrataClient, seg } from "../lib/client.ts";
import {
  impactLevels,
  opts,
  renewalScheduleTypes,
  vendorCategories,
  vendorRisks,
  vendorStatuses,
  vendorTypes,
} from "../lib/params.ts";

/**
 * `PUT /vendors/{vendorId}` — change a vendor. Despite the verb, every body field
 * is optional in the OpenAPI document, so only the fields supplied are sent.
 *
 * The contact email is `contactsEmail` here and `contactEmail` on create; see
 * `vendor-create`.
 */
interface Input {
  vendorId: number;
  name?: string;
  category?: string;
  risk?: string;
  status?: string;
  type?: string;
  impactLevel?: string;
  url?: string;
  servicesProvided?: string;
  dataStored?: string;
  location?: string;
  contactAtVendor?: string;
  contactsEmail?: string;
  notes?: string;
  userId?: number;
  renewalDate?: string;
  renewalScheduleType?: string;
}

const action: ActionDefinition<Input> = {
  key: "vendor-update",
  type: "perform",
  resource: "vendor",
  title: "Update Vendor",
  description:
    "Change a vendor's status, risk, contact or other details. Unset fields are left alone.",
  idempotent: true,
  params: [
    {
      key: "vendorId",
      label: "Vendor ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Vendors.",
    },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 191 } },
    { key: "category", label: "Category", type: "select", options: opts(vendorCategories) },
    { key: "risk", label: "Risk", type: "select", options: opts(vendorRisks) },
    { key: "status", label: "Status", type: "select", options: opts(vendorStatuses) },
    { key: "type", label: "Type", type: "select", options: opts(vendorTypes) },
    { key: "impactLevel", label: "Impact level", type: "select", options: opts(impactLevels) },
    {
      key: "url",
      label: "Website",
      type: "string",
      hint: "A full URL (https://…), up to 768 characters.",
    },
    { key: "servicesProvided", label: "Services provided", type: "text" },
    { key: "dataStored", label: "Data stored", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "contactAtVendor", label: "Vendor contact name", type: "string" },
    { key: "contactsEmail", label: "Vendor contact email", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "userId", label: "Owner user ID", type: "number" },
    { key: "renewalDate", label: "Renewal date", type: "date" },
    {
      key: "renewalScheduleType",
      label: "Renewal schedule",
      type: "select",
      options: opts(renewalScheduleTypes),
    },
  ],
  output: [
    { key: "id", type: "number", label: "Vendor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "risk", type: "string", label: "Risk" },
  ],

  execute(input, ctx) {
    const {
      vendorId,
      name,
      category,
      risk,
      status,
      type,
      impactLevel,
      url,
      servicesProvided,
      dataStored,
      location,
      contactAtVendor,
      contactsEmail,
      notes,
      userId,
      renewalDate,
      renewalScheduleType,
    } = input;
    return new DrataClient(ctx).put(
      `/vendors/${seg(vendorId)}`,
      compact({
        name,
        category,
        risk,
        status,
        type,
        impactLevel,
        url,
        servicesProvided,
        dataStored,
        location,
        contactAtVendor,
        contactsEmail,
        notes,
        userId,
        renewalDate,
        renewalScheduleType,
      }),
    );
  },
};

export default action;
