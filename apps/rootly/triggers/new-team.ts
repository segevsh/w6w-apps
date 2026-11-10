import { pollFromListAction } from "../../_shared/poll/mod.ts";
import teamList from "../actions/team-list.ts";

/** `GET /v1/teams` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created team.",
  action: teamList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "team_1",
    type: "groups",
    name: "Platform",
    slug: "platform",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
