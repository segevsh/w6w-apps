import type { ActionDefinition } from "@w6w/types";
import { encodeId, type HabitFields, habitPayload, TickTickClient } from "../lib/client.ts";
import { habitFieldParams, habitOutput, habitParam } from "../lib/params.ts";

interface Input extends HabitFields {
  habitId: string;
}

/**
 * `POST /open/v1/habit/{habitId}` — update a habit.
 *
 * `POST` again — there is no `PUT`/`PATCH` anywhere in this API.
 *
 * One documented trap, and it is a real one: **"If empty, it will be treated as
 * null"** is what TickTick says about `name` on *update* (and does not say on
 * create). So sending an empty string does not leave the name alone — it clears
 * it. This action only sends fields the caller actually set, so leaving Name
 * blank in the form omits it entirely rather than sending `""`. Passing a
 * deliberate empty string still reaches TickTick, because suppressing that would
 * be second-guessing an explicit instruction.
 *
 * Idempotent: the same body applied twice leaves the same habit.
 */
const updateHabit: ActionDefinition<Input> = {
  key: "update-habit",
  type: "perform",
  resource: "habit",
  title: "Update Habit",
  description:
    "Update a habit. Sends only the fields you set — note that an explicitly empty name is documented to null the habit's name.",
  idempotent: true,
  params: [
    habitParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { maxLength: 1000 },
      hint:
        "Max 1000 characters. TickTick documents that an *empty* name on update is treated as null, so leave this blank rather than clearing it if you mean 'no change'.",
    },
    ...habitFieldParams(),
  ],
  output: habitOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/habit/${encodeId(input.habitId)}`, {
      method: "POST",
      body: habitPayload(input),
    });
  },
};

export default updateHabit;
