import type { ActionDefinition } from "@w6w/types";
import { TickTickClient } from "../lib/client.ts";
import { arrayOutput } from "../lib/params.ts";

/**
 * `GET /open/v1/habit` — every habit.
 *
 * Parameterless, returns a bare JSON array, no paging — the same shape as List
 * Projects. This is where habit ids come from.
 *
 * TickTick's example response for this endpoint is abbreviated (four fields per
 * habit) while the single-habit read returns the full `OpenHabit`. The doc does
 * not say whether the list genuinely projects a subset or whether the example is
 * just short, so no assumption is baked in here: the array is passed through as
 * received.
 *
 * Note this endpoint's response table documents `200`, `401` and `403` but
 * **not** `404` — the only endpoint in the API where that is true. Nothing turns
 * on it; it is the sort of asymmetry worth not "correcting".
 */
const listHabits: ActionDefinition<Record<string, never>, { items: unknown[]; count: number }> = {
  key: "list-habits",
  type: "search",
  resource: "habit",
  title: "List Habits",
  description: "List every habit. Takes no parameters; the API has no paging or filter here.",
  params: [],
  output: arrayOutput("Habits"),

  async execute(_input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/habit");
    return { items, count: items.length };
  },
};

export default listHabits;
