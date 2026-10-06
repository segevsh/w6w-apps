import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Log time against a service (`POST /time_entries`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  personId: number;
  serviceId: number;
  date: string;
  time: number;
  note?: string;
  taskId?: number;
  startedAt?: string;
}

const timeEntryCreate: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "time_entry",
  title: "Create Time Entry",
  description: "Log time against a service (`POST /time_entries`).",
  idempotent: false,
  params: [
    { "key": "personId", "label": "Person ID", "type": "number", "required": true },
    {
      "key": "serviceId",
      "label": "Service ID",
      "type": "number",
      "required": true,
      "hint": "The budget service the time is booked against.",
    },
    { "key": "date", "label": "Date", "type": "date", "required": true },
    {
      "key": "time",
      "label": "Time (minutes)",
      "type": "number",
      "required": true,
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
    return await new ProductiveClient(ctx).one(`/time_entries`, {
      method: "POST",
      body: jsonApiBody("time_entries", attrs),
    });
  },
};

export default timeEntryCreate;
