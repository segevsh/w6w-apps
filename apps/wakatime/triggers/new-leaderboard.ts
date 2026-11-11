import { snapshotTrigger } from "../lib/snapshot.ts";
import leaderboardList from "../actions/leaderboard-list.ts";

/**
 * `GET /api/v1/users/current/leaderboards` (https://wakatime.com/developers#leaderboards, 2026-11-10) lists the user's private
 * leaderboards: a small collection (page 1 holds it all), so each check reads it and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-leaderboard",
  title: "New Private Leaderboard",
  description: "The run gets each private leaderboard the user newly belongs to.",
  action: leaderboardList as never,
  input: () => ({}),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Leaderboard ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "members_count", type: "number", label: "Members" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    id: "leaderboard-sample",
    name: "Team board",
    members_count: 4,
    created_at: "2026-11-09T12:00:00Z",
  },
});
