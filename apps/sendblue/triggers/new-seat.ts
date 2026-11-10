import type { TriggerDefinition } from "@w6w/types";
import seatList from "../actions/seat-list.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/v2/seats` returns every seat (rep) of the account as a bare array with no sort or date
 * filter — a small bounded collection, read-only in the API (https://docs.sendblue.com/api-v2/seats,
 * verified 2026-11-10). Every check reads it through `seat-list` and diffs the `seat_id`s.
 */
const trigger: TriggerDefinition = {
  key: "new-seat",
  title: "New Seat",
  description: "The run gets each seat (rep) newly added to your Sendblue account.",
  output: [
    { key: "seat_id", type: "string", label: "Seat ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    seat_id: "550e8400-e29b-41d4-a716-446655440000",
    email: "rep@example.com",
    first_name: "Jane",
    last_name: "Doe",
    created_at: "2024-06-15T18:24:01.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await seatList.execute({}, ctx);
    return newRecords({
      state,
      items: Array.isArray(res) ? res : [],
      idOf: (s) => (s as { seat_id?: unknown }).seat_id,
    });
  },
};

export default trigger;
