import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";

/** `POST /crm/v2/tenant/{tenant}/leads` — requires `campaignId` and `summary`. */
interface Input {
  campaignId: number;
  summary: string;
  customerId?: number;
  locationId?: number;
  businessUnitId?: number;
  jobTypeId?: number;
  priority?: string;
  followUpDate?: string;
  leadCustomerName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadStreet?: string;
  leadCity?: string;
  leadState?: string;
  leadZip?: string;
  tagTypeIds?: string;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create a Lead",
  description:
    "Create a lead. Link it to an existing customer, or give the prospect's own contact details.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "number", required: true },
    { key: "summary", label: "Summary", type: "text", required: true },
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "locationId", label: "Location ID", type: "number" },
    { key: "businessUnitId", label: "Business unit ID", type: "number" },
    { key: "jobTypeId", label: "Job type ID", type: "number" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { label: "Low", value: "Low" },
        { label: "Normal", value: "Normal" },
        { label: "High", value: "High" },
        { label: "Urgent", value: "Urgent" },
      ],
    },
    {
      key: "followUpDate",
      label: "Follow-up date",
      type: "string",
      placeholder: "2026-01-01T09:00:00Z",
      hint: "ISO 8601.",
    },
    { key: "leadCustomerName", label: "Prospect name", type: "string" },
    { key: "leadPhone", label: "Prospect phone", type: "string" },
    { key: "leadEmail", label: "Prospect email", type: "string" },
    { key: "leadStreet", label: "Prospect street", type: "string", advanced: true },
    { key: "leadCity", label: "Prospect city", type: "string", advanced: true },
    { key: "leadState", label: "Prospect state", type: "string", advanced: true },
    { key: "leadZip", label: "Prospect zip", type: "string", advanced: true },
    {
      key: "tagTypeIds",
      label: "Tag type IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "summary", type: "string", label: "Summary" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("crm", "/leads", {
      method: "POST",
      body: compact({
        campaignId: input.campaignId,
        summary: input.summary,
        customerId: input.customerId,
        locationId: input.locationId,
        businessUnitId: input.businessUnitId,
        jobTypeId: input.jobTypeId,
        priority: input.priority,
        followUpDate: input.followUpDate,
        leadCustomerName: input.leadCustomerName,
        leadPhone: input.leadPhone,
        leadEmail: input.leadEmail,
        leadStreet: input.leadStreet,
        leadCity: input.leadCity,
        leadState: input.leadState,
        leadZip: input.leadZip,
        tagTypeIds: idList(input.tagTypeIds),
      }),
    });
  },
};

export default leadCreate;
