import type { ActionDefinition } from "@w6w/types";
import { compact, HospitableClient, jsonValue } from "../lib/client.ts";

/** `POST /v2/tasks` — Create a manual operations task on a property. */
interface Input {
  property_id: string;
  task_type: number;
  start_date: string;
  end_date: string;
  teammate_uuid?: string;
  reservation_uuid?: string;
  note?: string;
  send_task_reminder?: boolean;
  payment_amount?: number;
  payment_currency?: string;
  checklist?: unknown;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a manual operations task (for example a cleaning) on a property, optionally assigned to an internal teammate. Marketplace assignment is not supported. Needs task:write.",
  idempotent: false,
  params: [
    { key: "property_id", label: "Property UUID", type: "string", required: true },
    {
      key: "task_type",
      label: "Task type",
      type: "number",
      required: true,
      hint: "Task type id 1-5; labels are in `meta.task_types` of any task response.",
      validation: { integer: true, min: 1, max: 5 },
    },
    {
      key: "start_date",
      label: "Start",
      type: "datetime",
      required: true,
      hint: "ISO-8601; without an offset it is read in the property's timezone.",
    },
    { key: "end_date", label: "End", type: "datetime", required: true, hint: "ISO-8601." },
    {
      key: "teammate_uuid",
      label: "Teammate UUID",
      type: "string",
      hint: "From List Teammates.",
    },
    { key: "reservation_uuid", label: "Reservation UUID", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "send_task_reminder", label: "Send task reminder", type: "boolean" },
    {
      key: "payment_amount",
      label: "Teammate payment (minor units)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "payment_currency", label: "Payment currency", type: "string", placeholder: "USD" },
    { key: "checklist", label: "Checklist", type: "json", hint: "Optional checklist object." },
  ],
  output: [
    { key: "data", type: "object", label: "The created task" },
    { key: "meta", type: "object", label: "Task enum labels" },
  ],

  execute(input, ctx) {
    const payment = input.payment_amount === undefined || input.payment_amount === null
      ? undefined
      : compact({ amount: Number(input.payment_amount), currency: input.payment_currency });
    return new HospitableClient(ctx).request("POST", "/tasks", {
      body: compact({
        property_id: input.property_id,
        task_type: Number(input.task_type),
        start_date: input.start_date,
        end_date: input.end_date,
        teammate_uuid: input.teammate_uuid,
        reservation_uuid: input.reservation_uuid,
        note: input.note,
        send_task_reminder: input.send_task_reminder,
        payment,
        checklist: jsonValue(input.checklist),
      }),
    });
  },
};

export default taskCreate;
