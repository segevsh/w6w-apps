import type { ActionDefinition } from "@w6w/types";
import { TickTickClient } from "../lib/client.ts";
import { arrayOutput } from "../lib/params.ts";

interface Input {
  habitIds: string[];
  from: number;
  to: number;
}

/**
 * `GET /open/v1/habit/checkins?habitIds=&from=&to=` — check-in history.
 *
 * All three parameters are required. Two shapes to get right:
 *
 *   - `habitIds` is a **comma-separated string in one query parameter**
 *     (`habitIds=habit-1,habit-2`), not a repeated parameter. The form collects
 *     a list and this action joins it, because the repeated form
 *     (`habitIds=a&habitIds=b`) is not what TickTick documents.
 *   - `from` / `to` are `YYYYMMDD` **integers**, matching the `stamp` on a
 *     check-in — not the timestamp strings every other date parameter in this
 *     API takes. The Habit endpoints use date stamps throughout.
 *
 * Returns a bare array of `OpenHabitCheckin` documents — one per habit *per
 * year*, each carrying a `checkins` array of the individual days. So a range
 * spanning a new year yields two documents for the same habit; that is
 * TickTick's storage shape, not a bug, and it is passed through as received.
 *
 * TickTick documents no cap on the range here (unlike List Focuses, which is
 * silently clamped to 30 days) and no paging.
 */
const listHabitCheckins: ActionDefinition<Input, { items: unknown[]; count: number }> = {
  key: "list-habit-checkins",
  type: "search",
  resource: "habit",
  title: "List Habit Check-Ins",
  description:
    "List check-in history for one or more habits over a date range. Dates are YYYYMMDD integers, not timestamps.",
  params: [
    {
      key: "habitIds",
      label: "Habits",
      type: "string",
      repeat: true,
      required: true,
      hint:
        "One or more habit ids. Sent as a single comma-separated parameter, which is the form TickTick documents.",
    },
    {
      key: "from",
      label: "From",
      type: "number",
      required: true,
      placeholder: "20260401",
      validation: { integer: true },
      hint: "Start date stamp as a `YYYYMMDD` integer — 20260401, not a timestamp.",
    },
    {
      key: "to",
      label: "To",
      type: "number",
      required: true,
      placeholder: "20260407",
      validation: { integer: true },
      hint: "End date stamp as a `YYYYMMDD` integer.",
    },
  ],
  output: arrayOutput("Check-in documents (one per habit per year)"),

  async execute(input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/habit/checkins", {
      query: {
        // Comma-separated in ONE parameter, per the documented example.
        habitIds: (input.habitIds ?? []).map((id) => id.trim()).filter(Boolean).join(","),
        from: input.from,
        to: input.to,
      },
    });
    return { items, count: items.length };
  },
};

export default listHabitCheckins;
