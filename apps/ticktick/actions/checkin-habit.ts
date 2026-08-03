import type { ActionDefinition, OutputField } from "@w6w/types";
import { compact, encodeId, optionalDate, TickTickClient } from "../lib/client.ts";
import { habitParam } from "../lib/params.ts";

interface Input {
  habitId: string;
  stamp: number;
  time?: string;
  opTime?: string;
  value?: number;
  goal?: number;
  status?: number;
}

/**
 * `POST /open/v1/habit/{habitId}/checkin` — record (or amend) a check-in.
 *
 * TickTick titles this "Create **Or Update** Habit Check-In", and that is the
 * whole design: a check-in is keyed by its `stamp` — a `YYYYMMDD` **integer**,
 * not a date string — so posting the same stamp twice amends the existing entry
 * rather than adding a second. That is what makes this action `idempotent: true`
 * despite being a create.
 *
 * The two date shapes in one request body are easy to confuse:
 *
 *   - `stamp` — `20260407`, an integer. **Which day** is being checked in.
 *   - `time` / `opTime` — `2026-04-07T08:00:00+0000`, timestamps. When the habit
 *     was done, and when the record was made. Both optional.
 *
 * The response is an `OpenHabitCheckin` — the habit's whole check-in document
 * for that year, not just the entry that was written.
 *
 * `value` and `goal` both default to `1.0`, which is what a boolean "did it"
 * habit uses; a measured habit (pages read, litres drunk) sets `value`.
 */
const output: OutputField[] = [
  { key: "id", type: "string", label: "Check-in document ID" },
  { key: "habitId", type: "string", label: "Habit ID" },
  { key: "year", type: "number", label: "Year" },
  { key: "checkins", type: "array", label: "Check-in entries" },
];

const checkinHabit: ActionDefinition<Input> = {
  key: "checkin-habit",
  type: "perform",
  resource: "habit",
  title: "Check In Habit",
  description:
    "Record or amend a habit check-in for one day. Keyed by a YYYYMMDD stamp, so re-posting the same day updates rather than duplicates.",
  idempotent: true,
  params: [
    habitParam,
    {
      key: "stamp",
      label: "Date stamp",
      type: "number",
      required: true,
      placeholder: "20260407",
      validation: { integer: true },
      hint:
        'The day being checked in, as a `YYYYMMDD` **integer** — 20260407, not "2026-04-07". This is the key: posting the same stamp again amends that day\'s entry.',
    },
    {
      key: "value",
      label: "Value",
      type: "number",
      hint: "How much was done. Defaults to 1.0 — the right value for a yes/no habit.",
    },
    {
      key: "goal",
      label: "Goal",
      type: "number",
      hint: "The target this check-in was measured against. Defaults to 1.0.",
    },
    {
      key: "time",
      label: "Check-in time",
      type: "datetime",
      advanced: true,
      hint: "When the habit was actually done. A timestamp, unlike the stamp above.",
    },
    {
      key: "opTime",
      label: "Operation time",
      type: "datetime",
      advanced: true,
      hint: "When this record was made — TickTick's own bookkeeping field.",
    },
    {
      key: "status",
      label: "Status",
      type: "number",
      advanced: true,
      validation: { integer: true },
      hint: "TickTick documents this as an int32 and never enumerates its values.",
    },
  ],
  output,

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/habit/${encodeId(input.habitId)}/checkin`, {
      method: "POST",
      body: compact({
        stamp: input.stamp,
        time: optionalDate(input.time),
        opTime: optionalDate(input.opTime),
        value: input.value,
        goal: input.goal,
        status: input.status,
      }),
    });
  },
};

export default checkinHabit;
