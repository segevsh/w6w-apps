import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HospitableClient, jsonValue } from "../lib/client.ts";

/** `PATCH /v2/tasks/{id}` — Partially update a manual operations task. */
interface Input {
  id: string;
  start_date?: string;
  end_date?: string;
  teammate_uuid?: string;
  unassign_teammate?: boolean;
  reservation_uuid?: string;
  note?: string;
  send_task_reminder?: boolean;
  payment_amount?: number;
  payment_currency?: string;
  checklist?: unknown;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Change a manual operations task: its times, teammate, note, reminder, payment or checklist. Send only what should change. Marketplace assignments cannot be changed. Needs task:write.",
  idempotent: true,
  params: [
    { key: "id", label: "Task UUID", type: "string", required: true },
    {
      key: "start_date",
      label: "Start",
      type: "datetime",
      hint: "ISO-8601; without an offset it is read in the property's timezone.",
    },
    { key: "end_date", label: "End", type: "datetime", hint: "ISO-8601." },
    { key: "teammate_uuid", label: "Teammate UUID", type: "string" },
    {
      key: "unassign_teammate",
      label: "Unassign teammate",
      type: "boolean",
      hint:
        "Send teammate_uuid null to clear the current internal teammate. Wins over Teammate UUID.",
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
    { key: "checklist", label: "Checklist", type: "json" },
  ],
  output: [
    { key: "data", type: "object", label: "The updated task" },
    { key: "meta", type: "object", label: "Task enum labels" },
  ],

  execute(input, ctx) {
    const payment = input.payment_amount === undefined || input.payment_amount === null
      ? undefined
      : compact({ amount: Number(input.payment_amount), currency: input.payment_currency });
    const body = compact({
      start_date: input.start_date,
      end_date: input.end_date,
      teammate_uuid: input.unassign_teammate ? null : input.teammate_uuid,
      reservation_uuid: input.reservation_uuid,
      note: input.note,
      send_task_reminder: input.send_task_reminder,
      payment,
      checklist: jsonValue(input.checklist),
    });
    return new HospitableClient(ctx).request("PATCH", `/tasks/${encodeId(input.id)}`, { body });
  },
};

export default taskUpdate;
