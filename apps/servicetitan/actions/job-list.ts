import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import {
  createdParam,
  idsParam,
  listOutput,
  modifiedParam,
  pagingParams,
  pagingQuery,
} from "../lib/params.ts";

/** `GET /jpm/v2/tenant/{tenant}/jobs`. */
interface Input {
  ids?: string;
  number?: string;
  jobStatus?: string;
  priority?: string;
  customerId?: number;
  locationId?: number;
  technicianId?: number;
  jobTypeId?: number;
  businessUnitId?: number;
  projectId?: number;
  appointmentStartsOnOrAfter?: string;
  appointmentStartsBefore?: string;
  completedOnOrAfter?: string;
  createdOnOrAfter?: string;
  modifiedOnOrAfter?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List jobs, filtered by status, customer, technician, appointment window or date.",
  params: [
    idsParam,
    { key: "number", label: "Job number", type: "string" },
    {
      key: "jobStatus",
      label: "Job status",
      type: "select",
      options: [
        { label: "Scheduled", value: "Scheduled" },
        { label: "Dispatched", value: "Dispatched" },
        { label: "In progress", value: "InProgress" },
        { label: "Hold", value: "Hold" },
        { label: "Completed", value: "Completed" },
        { label: "Canceled", value: "Canceled" },
      ],
    },
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
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "locationId", label: "Location ID", type: "number" },
    {
      key: "technicianId",
      label: "Technician ID",
      type: "number",
      hint: "Jobs where this technician is assigned to any appointment.",
    },
    { key: "jobTypeId", label: "Job type ID", type: "number", advanced: true },
    { key: "businessUnitId", label: "Business unit ID", type: "number", advanced: true },
    { key: "projectId", label: "Project ID", type: "number", advanced: true },
    {
      key: "appointmentStartsOnOrAfter",
      label: "Appointment starts on or after",
      type: "string",
      hint: "ISO 8601, UTC. Matches jobs with any appointment in the window.",
    },
    {
      key: "appointmentStartsBefore",
      label: "Appointment starts before",
      type: "string",
      hint: "ISO 8601, UTC.",
    },
    { key: "completedOnOrAfter", label: "Completed on or after", type: "string", advanced: true },
    createdParam,
    modifiedParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("jpm", "/jobs", {
      query: compact({
        ids: idList(input.ids),
        number: input.number,
        jobStatus: input.jobStatus,
        priority: input.priority,
        customerId: input.customerId,
        locationId: input.locationId,
        technicianId: input.technicianId,
        jobTypeId: input.jobTypeId,
        businessUnitId: input.businessUnitId,
        projectId: input.projectId,
        appointmentStartsOnOrAfter: input.appointmentStartsOnOrAfter,
        appointmentStartsBefore: input.appointmentStartsBefore,
        completedOnOrAfter: input.completedOnOrAfter,
        createdOnOrAfter: input.createdOnOrAfter,
        modifiedOnOrAfter: input.modifiedOnOrAfter,
        ...pagingQuery(input),
      }),
    });
  },
};

export default jobList;
