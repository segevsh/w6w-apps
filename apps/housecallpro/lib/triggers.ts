import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import employeeList from "../actions/employee-list.ts";
import estimateList from "../actions/estimate-list.ts";
import estimateOptionLineItemList from "../actions/estimate-option-line-item-list.ts";
import eventList from "../actions/event-list.ts";
import invoiceList from "../actions/invoice-list.ts";
import jobAppointmentList from "../actions/job-appointment-list.ts";
import jobInvoiceList from "../actions/job-invoice-list.ts";
import jobLineItemList from "../actions/job-line-item-list.ts";
import jobList from "../actions/job-list.ts";
import leadList from "../actions/lead-list.ts";

const listItems = (result: unknown) => (result as { items?: unknown[] }).items ?? [];
const idOf = (item: unknown) => String((item as { id?: unknown }).id ?? "");
const updatedIdOf = (item: unknown) => {
  const row = item as { id?: unknown; updated_at?: unknown; updatedAt?: unknown };
  return `${String(row.id ?? "")}:${String(row.updated_at ?? row.updatedAt ?? "")}`;
};
const output = [{ key: "id", type: "string", label: "Record ID" }] as const;
const input = () => ({ sortBy: "created_at", sortDirection: "desc", page: 1, pageSize: 100 });
const updatedInput = () => ({
  sortBy: "updated_at",
  sortDirection: "desc",
  page: 1,
  pageSize: 100,
});

function newest(
  key: string,
  title: string,
  action: ActionDefinition,
  sample: unknown,
): TriggerDefinition {
  return pollFromListAction({
    key,
    title,
    description: `The run gets each ${title.toLowerCase()} created since the last check.`,
    action,
    input,
    items: listItems,
    idOf,
    output: [...output],
    sample,
    maxPages: 1,
  });
}

function newOrUpdated(
  key: string,
  title: string,
  action: ActionDefinition,
  sample: unknown,
): TriggerDefinition {
  return pollFromListAction({
    key,
    title,
    description: `The run gets each ${
      title.replace("New or Updated ", "").toLowerCase()
    } that is new or edited since the last check.`,
    action,
    input: updatedInput,
    items: listItems,
    idOf: updatedIdOf,
    output: [...output],
    sample,
    maxPages: 1,
  });
}

interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: unknown;
  params: Param[];
  input(params: Record<string, unknown>): Record<string, unknown>;
  sample: unknown;
}

function newSnapshot(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: [...output],
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const action = spec.action as {
        execute(input: Record<string, unknown>, context: HookContext): Promise<unknown>;
      };
      const result = await action.execute(spec.input(params as Record<string, unknown>), ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: listItems(result).map((item) => ({ key: idOf(item), values: item })),
        emit: { added: true, updated: false, removed: false },
        maxRows: 5000,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}

export const newEmployee = newest("new-employee", "New Employee", employeeList, {
  id: "employee-1",
  name: "Ada Lovelace",
});
export const newEstimate = newest("new-estimate", "New Estimate", estimateList, {
  id: "estimate-1",
  total_amount: 12500,
});
export const newOrUpdatedEstimate = newOrUpdated(
  "new-or-updated-estimate",
  "New or Updated Estimate",
  estimateList,
  { id: "estimate-1", updated_at: "2026-11-10T10:00:00Z" },
);
export const newEvent = newest("new-event", "New Event", eventList, {
  id: "event-1",
  name: "Team meeting",
});
export const newOrUpdatedEvent = newOrUpdated(
  "new-or-updated-event",
  "New or Updated Event",
  eventList,
  { id: "event-1", updated_at: "2026-11-10T10:00:00Z" },
);
export const newInvoice = newest("new-invoice", "New Invoice", invoiceList, {
  id: "invoice-1",
  total_amount: 12500,
});
export const newJob = newest("new-job", "New Job", jobList, {
  id: "job-1",
  description: "Repair heater",
});
export const newOrUpdatedJob = newOrUpdated("new-or-updated-job", "New or Updated Job", jobList, {
  id: "job-1",
  updated_at: "2026-11-10T10:00:00Z",
});
export const newLead = newest("new-lead", "New Lead", leadList, {
  id: "lead-1",
  status: "open",
});

const jobIdParam: Param = { key: "jobId", label: "Job ID", type: "string", required: true };
const companyIdParam: Param = { key: "companyId", label: "Company ID", type: "string" };
export const newJobAppointment = newSnapshot({
  key: "new-job-appointment",
  title: "New Job Appointment",
  description: "The run gets each appointment added to the selected job.",
  action: jobAppointmentList,
  params: [jobIdParam, companyIdParam],
  input: (params) => ({ jobId: params.jobId, companyId: params.companyId }),
  sample: { id: "appointment-1", start_time: "2026-11-10T10:00:00Z" },
});
export const newJobInvoice = newSnapshot({
  key: "new-job-invoice",
  title: "New Job Invoice",
  description: "The run gets each invoice added to the selected job.",
  action: jobInvoiceList,
  params: [jobIdParam, companyIdParam],
  input: (params) => ({ jobId: params.jobId, companyId: params.companyId }),
  sample: { id: "invoice-1", total_amount: 12500 },
});
export const newJobLineItem = newSnapshot({
  key: "new-job-line-item",
  title: "New Job Line Item",
  description: "The run gets each line item added to the selected job.",
  action: jobLineItemList,
  params: [jobIdParam, companyIdParam],
  input: (params) => ({ jobId: params.jobId, companyId: params.companyId }),
  sample: { id: "line-item-1", name: "Replacement part" },
});
export const newEstimateOptionLineItem = newSnapshot({
  key: "new-estimate-option-line-item",
  title: "New Estimate Option Line Item",
  description: "The run gets each line item added to the selected estimate option.",
  action: estimateOptionLineItemList,
  params: [
    { key: "estimateId", label: "Estimate ID", type: "string", required: true },
    { key: "optionId", label: "Option ID", type: "string", required: true },
    companyIdParam,
  ],
  input: (params) => ({
    estimateId: params.estimateId,
    optionId: params.optionId,
    companyId: params.companyId,
    page: 1,
    pageSize: 100,
  }),
  sample: { id: "line-item-1", name: "Replacement part" },
});
