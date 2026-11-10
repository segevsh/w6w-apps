import type { ActionDefinition } from "@w6w/types";
import { listSnapshot } from "../lib/triggers.ts";
import appointmentList from "../actions/appointment-list.ts";

/** No sort or since filter exists on this endpoint (Lofty OpenAPI, https://api.lofty.com/docs/), so the list is diffed by id. */
export default listSnapshot({
  key: "new-appointment",
  title: "New Appointment",
  description: "The run gets each new appointment on one lead: id, description, address and times.",
  action: appointmentList as unknown as ActionDefinition,
  listKey: null,
  idKey: "id",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead to watch, from List Leads or New Lead.",
    },
  ],
  input: (params) => ({ leadId: params.leadId }),
  output: [
    { key: "id", type: "number", label: "Appointment ID" },
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "descr", type: "string", label: "Description" },
    { key: "address", type: "string", label: "Address" },
    { key: "deadline", type: "number", label: "Start (epoch ms)" },
    { key: "createTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: 4001,
    leadId: 651095960136641,
    descr: "Showing",
    address: "12 Oak St",
    deadline: 1747272300000,
    createTime: "2026-11-10 09:00:00",
  },
});
