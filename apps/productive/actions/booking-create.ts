import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Book a person's time (`POST /bookings`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  personId: number;
  startedOn: string;
  endedOn: string;
  time?: number;
  percentage?: number;
  totalTime?: number;
  serviceId?: number;
  eventId?: number;
  taskId?: number;
  draft?: boolean;
  note?: string;
}

const bookingCreate: ActionDefinition<Input> = {
  key: "booking-create",
  type: "perform",
  resource: "booking",
  title: "Create Booking",
  description: "Book a person's time (`POST /bookings`).",
  idempotent: false,
  params: [
    { "key": "personId", "label": "Person ID", "type": "number", "required": true },
    { "key": "startedOn", "label": "Start date", "type": "date", "required": true },
    { "key": "endedOn", "label": "End date", "type": "date", "required": true },
    {
      "key": "time",
      "label": "Time per day (minutes)",
      "type": "number",
      "hint": "Booked minutes per day. Give one of time, percentage or total time.",
    },
    { "key": "percentage", "label": "Percentage of capacity", "type": "number" },
    { "key": "totalTime", "label": "Total time (minutes)", "type": "number" },
    {
      "key": "serviceId",
      "label": "Service ID",
      "type": "number",
      "hint": "Book against a budget service (or give an event id instead).",
    },
    { "key": "eventId", "label": "Event ID", "type": "number" },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    {
      "key": "draft",
      "label": "Tentative",
      "type": "boolean",
      "hint": "true books it as tentative.",
    },
    { "key": "note", "label": "Note", "type": "text" },
  ],
  output: resourceOutput("Booking"),

  async execute(input, ctx) {
    const attrs = {
      "person_id": input.personId,
      "started_on": input.startedOn,
      "ended_on": input.endedOn,
      "time": input.time,
      "percentage": input.percentage,
      "total_time": input.totalTime,
      "service_id": input.serviceId,
      "event_id": input.eventId,
      "task_id": input.taskId,
      "draft": input.draft,
      "note": input.note,
    };
    return await new ProductiveClient(ctx).one(`/bookings`, {
      method: "POST",
      body: jsonApiBody("bookings", attrs),
    });
  },
};

export default bookingCreate;
