import type { ActionDefinition } from "@w6w/types";
import { type HabitFields, habitPayload, TickTickClient } from "../lib/client.ts";
import { habitFieldParams, habitOutput } from "../lib/params.ts";

interface Input extends HabitFields {
  name: string;
}

/**
 * `POST /open/v1/habit` — create a habit.
 *
 * `name` is the only required field, and it is the one field TickTick documents
 * a constraint on: **maximum 1000 characters**. That is validated here rather
 * than left to a `400`.
 *
 * Everything else is optional and mostly undocumented as to defaults, so nothing
 * is invented: a call with just a name sends a one-field body and TickTick
 * supplies the rest. `goal` and `step` default to `1.0` per the check-in table;
 * `type` shows only `"Boolean"` in the examples but is typed as a free `string`
 * and is never enumerated, so it is offered as free text rather than as a select
 * that would be guessing.
 *
 * TickTick mints a fresh id per call — `idempotent: false`.
 */
const createHabit: ActionDefinition<Input> = {
  key: "create-habit",
  type: "perform",
  resource: "habit",
  title: "Create Habit",
  description: "Create a habit. Only the name is required (max 1000 characters).",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 1000 },
      hint: "TickTick documents a 1000-character maximum.",
    },
    ...habitFieldParams(),
  ],
  output: habitOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request("/habit", { method: "POST", body: habitPayload(input) });
  },
};

export default createHabit;
