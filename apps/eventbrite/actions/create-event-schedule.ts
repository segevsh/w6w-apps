import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  occurrenceDuration: number;
  recurrenceRule: string;
  extra?: Record<string, unknown>;
}

const createEventSchedule: ActionDefinition<Input> = {
  key: "create-event-schedule",
  type: "perform",
  idempotent: false,
  resource: "event",
  title: "Create Event Schedule",
  description:
    "Add occurrences to a series parent event on Eventbrite according to an iCalendar recurrence rule. Occurrences matching an existing date/time are skipped.",
  params: [
    {
      key: "eventId",
      label: "Series parent event ID",
      type: "string",
      required: true,
      hint: "Must be an event created with Series parent enabled.",
    },
    {
      key: "occurrenceDuration",
      label: "Occurrence duration (seconds)",
      type: "number",
      required: true,
      hint: "Between 0 and 7 days (604800).",
    },
    {
      key: "recurrenceRule",
      label: "Recurrence rule",
      type: "text",
      required: true,
      hint:
        "RFC 5545, DTSTART in UTC, e.g. `DTSTART:20261201T023000Z\\nRRULE:FREQ=WEEKLY;COUNT=5`.",
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object deep-merged into the `schedule` body.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Schedule ID" },
    { key: "occurrence_duration", type: "number", label: "Occurrence duration" },
    { key: "recurrence_rule", type: "string", label: "Recurrence rule" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const schedule: Record<string, unknown> = {
      occurrence_duration: input.occurrenceDuration,
      recurrence_rule: input.recurrenceRule,
    };
    return client.request(`/events/${encodeURIComponent(input.eventId)}/schedules/`, {
      method: "POST",
      body: { schedule: input.extra ? deepMerge(schedule, input.extra) : schedule },
    });
  },
};

export default createEventSchedule;
