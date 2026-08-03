import type { ActionDefinition } from "@w6w/types";
import { encodeId, TickTickClient } from "../lib/client.ts";
import { habitOutput, habitParam } from "../lib/params.ts";

/**
 * `GET /open/v1/habit/{habitId}` — one habit, in full.
 *
 * The complete `OpenHabit`: goal, step, unit, repeat rule, target dates,
 * `totalCheckIns`, and the section it lives in. Habit ids come from **List
 * Habits**.
 *
 * `totalCheckIns` is a running count, not the check-in records themselves — for
 * those, use **List Habit Check-Ins**, which is a separate endpoint keyed by
 * date stamps.
 */
const getHabit: ActionDefinition<{ habitId: string }> = {
  key: "get-habit",
  type: "read",
  resource: "habit",
  title: "Get Habit",
  description: "Fetch one habit by id, in full. For its check-in history use List Habit Check-Ins.",
  params: [habitParam],
  output: habitOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/habit/${encodeId(input.habitId)}`);
  },
};

export default getHabit;
