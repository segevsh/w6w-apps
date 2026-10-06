import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";

/**
 * `POST /jpm/v2/tenant/{tenant}/jobs`. The spec requires `customerId`,
 * `locationId`, `businessUnitId`, `jobTypeId`, `priority`, `campaignId` and a
 * non-empty `appointments` array (each with `start` and `end`) — so a job
 * cannot be created without its first appointment.
 */
interface Input {
  customerId: number;
  locationId: number;
  businessUnitId: number;
  jobTypeId: number;
  campaignId: number;
  priority: string;
  appointmentStart: string;
  appointmentEnd: string;
  arrivalWindowStart?: string;
  arrivalWindowEnd?: string;
  technicianIds?: string;
  summary?: string;
  customerPo?: string;
  tagTypeIds?: string;
  leadId?: number;
  bookingId?: number;
}

const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create a Job",
  description: "Create a job with its first appointment at an existing customer location.",
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "locationId", label: "Location ID", type: "number", required: true },
    { key: "businessUnitId", label: "Business unit ID", type: "number", required: true },
    { key: "jobTypeId", label: "Job type ID", type: "number", required: true },
    { key: "campaignId", label: "Campaign ID", type: "number", required: true },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      required: true,
      default: "Normal",
      options: [
        { label: "Low", value: "Low" },
        { label: "Normal", value: "Normal" },
        { label: "High", value: "High" },
        { label: "Urgent", value: "Urgent" },
      ],
    },
    {
      key: "appointmentStart",
      label: "Appointment start",
      type: "string",
      required: true,
      placeholder: "2026-01-01T09:00:00Z",
      hint: "ISO 8601.",
    },
    {
      key: "appointmentEnd",
      label: "Appointment end",
      type: "string",
      required: true,
      placeholder: "2026-01-01T11:00:00Z",
      hint: "ISO 8601.",
    },
    { key: "arrivalWindowStart", label: "Arrival window start", type: "string", advanced: true },
    { key: "arrivalWindowEnd", label: "Arrival window end", type: "string", advanced: true },
    {
      key: "technicianIds",
      label: "Technician IDs",
      type: "string",
      hint: "Comma-separated technicians to assign to the appointment.",
    },
    { key: "summary", label: "Summary", type: "text" },
    { key: "customerPo", label: "Customer PO", type: "string", advanced: true },
    { key: "tagTypeIds", label: "Tag type IDs", type: "string", advanced: true },
    { key: "leadId", label: "Lead ID", type: "number", advanced: true },
    { key: "bookingId", label: "Booking ID", type: "number", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "jobNumber", type: "string", label: "Job number" },
    { key: "jobStatus", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("jpm", "/jobs", {
      method: "POST",
      body: compact({
        customerId: input.customerId,
        locationId: input.locationId,
        businessUnitId: input.businessUnitId,
        jobTypeId: input.jobTypeId,
        campaignId: input.campaignId,
        priority: input.priority,
        appointments: [compact({
          start: input.appointmentStart,
          end: input.appointmentEnd,
          arrivalWindowStart: input.arrivalWindowStart,
          arrivalWindowEnd: input.arrivalWindowEnd,
          technicianIds: idList(input.technicianIds),
        })],
        summary: input.summary,
        customerPo: input.customerPo,
        tagTypeIds: idList(input.tagTypeIds),
        leadId: input.leadId,
        bookingId: input.bookingId,
      }),
    });
  },
};

export default jobCreate;
