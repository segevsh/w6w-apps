import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Change a booking (`PATCH /bookings/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  personId?: number;
  startedOn?: string;
  endedOn?: string;
  time?: number;
  percentage?: number;
  totalTime?: number;
  serviceId?: number;
  eventId?: number;
  taskId?: number;
  draft?: boolean;
  note?: string;
}

const bookingUpdate: ActionDefinition<Input> = {
  key: "booking-update",
  type: "perform",
  resource: "booking",
  title: "Update Booking",
  description: "Change a booking (`PATCH /bookings/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    { "key": "personId", "label": "Person ID", "type": "number" },
    { "key": "startedOn", "label": "Start date", "type": "date" },
    { "key": "endedOn", "label": "End date", "type": "date" },
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
    requireAny(attrs, "booking");
    return await new ProductiveClient(ctx).one(`/bookings/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("bookings", attrs),
    });
  },
};

export default bookingUpdate;
