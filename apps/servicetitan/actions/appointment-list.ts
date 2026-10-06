import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import {
  activeParam,
  idsParam,
  listOutput,
  modifiedParam,
  pagingParams,
  pagingQuery,
} from "../lib/params.ts";

/** `GET /jpm/v2/tenant/{tenant}/appointments`. */
interface Input {
  ids?: string;
  jobId?: number;
  customerId?: number;
  technicianId?: number;
  status?: string;
  startsOnOrAfter?: string;
  startsBefore?: string;
  active?: string;
  modifiedOnOrAfter?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const appointmentList: ActionDefinition<Input> = {
  key: "appointment-list",
  type: "search",
  resource: "appointment",
  title: "List Appointments",
  description: "List appointments by job, customer, technician, status or start window.",
  params: [
    idsParam,
    { key: "jobId", label: "Job ID", type: "number" },
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "technicianId", label: "Technician ID", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Scheduled", value: "Scheduled" },
        { label: "Dispatched", value: "Dispatched" },
        { label: "Working", value: "Working" },
        { label: "Hold", value: "Hold" },
        { label: "Done", value: "Done" },
        { label: "Canceled", value: "Canceled" },
      ],
    },
    {
      key: "startsOnOrAfter",
      label: "Starts on or after",
      type: "string",
      hint: "ISO 8601, UTC.",
    },
    { key: "startsBefore", label: "Starts before", type: "string", hint: "ISO 8601, UTC." },
    activeParam,
    modifiedParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("jpm", "/appointments", {
      query: compact({
        ids: idList(input.ids),
        jobId: input.jobId,
        customerId: input.customerId,
        technicianId: input.technicianId,
        status: input.status,
        startsOnOrAfter: input.startsOnOrAfter,
        startsBefore: input.startsBefore,
        active: input.active,
        modifiedOnOrAfter: input.modifiedOnOrAfter,
        ...pagingQuery(input),
      }),
    });
  },
};

export default appointmentList;
