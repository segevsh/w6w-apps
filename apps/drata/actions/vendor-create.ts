import type { ActionDefinition } from "@w6w/types";
import { compact, DrataClient } from "../lib/client.ts";
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
 * `POST /vendors` — add a vendor to the vendor register.
 *
 * **The contact email is spelled differently on create and update.** The create
 * body takes `contactEmail`; the update body takes `contactsEmail`, and the vendor
 * record itself returns `contactsEmail`. Sending the "wrong" spelling to either is
 * not an error — it is simply not stored — so this action sends `contactEmail` here
 * and `vendor-update` sends `contactsEmail`, each as the OpenAPI document spells it.
 */
interface Input {
  name: string;
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
  contactEmail?: string;
  notes?: string;
  hasPii?: boolean;
  isSubProcessor?: boolean;
  userId?: number;
  renewalDate?: string;
  renewalScheduleType?: string;
}

const action: ActionDefinition<Input> = {
  key: "vendor-create",
  type: "perform",
  resource: "vendor",
  title: "Create Vendor",
  description: "Add a vendor to the vendor register.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 191 } },
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
    { key: "contactEmail", label: "Vendor contact email", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "hasPii", label: "Stores PII", type: "boolean" },
    { key: "isSubProcessor", label: "Is a sub-processor", type: "boolean" },
    {
      key: "userId",
      label: "Owner user ID",
      type: "number",
      hint: "The Drata user who owns this vendor relationship.",
    },
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
    return new DrataClient(ctx).post("/vendors", compact({ ...input }));
  },
};

export default action;
