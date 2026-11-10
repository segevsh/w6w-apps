import { snapshotTrigger } from "../lib/snapshot.ts";
import goalList from "../actions/goal-list.ts";

/**
 * `GET /api/v1/users/current/goals` (https://wakatime.com/developers#goals, 2026-11-10) pages its list but the action reads page 1 only, and a user
 * has a handful of goals, so page 1 holds all of them: each check reads it and diffs the goal ids.
 */
export default snapshotTrigger({
  key: "new-goal",
  title: "New Goal",
  description: "The run gets each coding goal newly created on the account.",
  action: goalList as never,
  input: () => ({}),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Goal ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "delta", type: "string", label: "Period (day or week)" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "modified_at", type: "string", label: "Modified" },
  ],
  sample: {
    id: "goal-sample",
    title: "Code 2 hours a day",
    delta: "day",
    created_at: "2026-11-09T12:00:00Z",
    modified_at: "2026-11-09T12:00:00Z",
  },
});
