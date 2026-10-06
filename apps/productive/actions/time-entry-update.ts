import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Change a time entry (`PATCH /time_entries/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  personId?: number;
  serviceId?: number;
  date?: string;
  time?: number;
  note?: string;
  taskId?: number;
  startedAt?: string;
}

const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time_entry",
  title: "Update Time Entry",
  description:
    "Change a time entry (`PATCH /time_entries/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Time entry ID", type: "string", required: true },
    { "key": "personId", "label": "Person ID", "type": "number" },
    {
      "key": "serviceId",
      "label": "Service ID",
      "type": "number",
      "hint": "The budget service the time is booked against.",
    },
    { "key": "date", "label": "Date", "type": "date" },
    {
      "key": "time",
      "label": "Time (minutes)",
      "type": "number",
      "hint": "Duration of work in minutes.",
    },
    { "key": "note", "label": "Note", "type": "text" },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "startedAt", "label": "Started at", "type": "datetime" },
  ],
  output: resourceOutput("Time entry"),

  async execute(input, ctx) {
    const attrs = {
      "person_id": input.personId,
      "service_id": input.serviceId,
      "date": input.date,
      "time": input.time,
      "note": input.note,
      "task_id": input.taskId,
      "started_at": input.startedAt,
    };
    requireAny(attrs, "time entry");
    return await new ProductiveClient(ctx).one(`/time_entries/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("time_entries", attrs),
    });
  },
};

export default timeEntryUpdate;
