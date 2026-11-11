import { snapshotTrigger } from "../lib/snapshot.ts";
import goalList from "../actions/goal-list.ts";

/**
 * Same bounded list as `new-goal`; each goal carries `modified_at` (https://wakatime.com/developers#goals, 2026-11-10), kept in the
 * snapshot row, so an edit is a new event.
 */
export default snapshotTrigger({
  key: "new-or-updated-goal",
  title: "New or Updated Goal",
  description: "The run gets each coding goal that is created or modified.",
  action: goalList as never,
  input: () => ({}),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  stampOf: (i) => (i as { modified_at?: unknown }).modified_at,
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
    created_at: "2026-11-01T12:00:00Z",
    modified_at: "2026-11-09T12:00:00Z",
  },
});
