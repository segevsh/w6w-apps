import type { Param } from "@w6w/types";
import { requiredId, sinceTrigger } from "../lib/triggers.ts";
import dispatchList from "../actions/dispatch-list.ts";

interface Dispatch {
  id?: number | string;
}

const FORM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "The form whose dispatches to watch (Get Many Forms lists the ids).",
};

/**
 * Dispatches are read through `GET /dispatches?form_id=…&start_date=…` (Get Many Dispatches): every
 * item carries `created_at` and `start_date` "filters the Dispatches' created_at". The webhook
 * trigger (Dispatch Created) needs a Company Admin or Designer and allows one webhook per form and
 * event, and its delivery is metadata only; this poll returns the whole dispatch record.
 *
 * Docs (verified 2026-11-10): https://api.gocanvas.com/api/v3/docs#list-all-dispatches
 */
const newDispatch = sinceTrigger({
  key: "new-dispatch",
  title: "New Dispatch",
  description:
    "The run gets each new dispatch of the chosen form (Get Many Dispatches). No webhook setup or administrator rights needed.",
  params: [FORM],
  action: dispatchList,
  input: (p) => ({ formId: requiredId(p, "formId", "Form ID") }),
  idOf: (d) => String((d as Dispatch).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Dispatch ID" },
    { key: "form_id", type: "number", label: "Form ID" },
    { key: "user_id", type: "number", label: "Assigned user ID" },
    { key: "department_id", type: "number", label: "Department ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "status", type: "string", label: "Status" },
    { key: "scheduled_at", type: "string", label: "Scheduled at" },
    { key: "scheduled_end", type: "string", label: "Scheduled end" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 194780,
    type: "dispatch_item",
    form_id: 346103,
    user_id: 840365,
    department_id: 11942,
    customer_id: null,
    project_id: null,
    site_id: null,
    submission_id: null,
    name: "Repair request",
    description: "123 Main St Service Request",
    status: "assigned",
    scheduled_at: "2024-10-01T08:00:00Z",
    scheduled_end: "2024-12-01T12:00:00Z",
    sent_at: null,
    completed_at: null,
    deleted_at: null,
    send_calendar_invite: true,
    reminder_interval: 60,
    created_at: "2024-11-11T21:09:02Z",
  },
});

export default newDispatch;
