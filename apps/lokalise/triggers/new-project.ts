import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

/** Lokalise's documented ceiling for `limit` on `GET /projects`. */
const MAX_ROWS = 5000;

interface Project {
  project_id?: unknown;
}

/**
 * `GET /projects` (the `project-list` action) in one request: the projects a token can reach are a
 * small bounded collection (the endpoint's `limit` goes up to 5000, one page), so each check
 * snapshots and diffs it. Lokalise has no project-created webhook event, so this is a poll.
 * Docs (verified 2026-11-10): https://developers.lokalise.com/reference/list-all-projects
 */
const trigger: TriggerDefinition = {
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each Lokalise project newly created in (or newly shared with) the token's account: the project (id, name, type, base language, team, created time).",
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Project ID" },
    { key: "values", type: "object", label: "Project (project_id, name, project_type, …)" },
  ],
  sample: {
    change: "added",
    key: "sample-project-id",
    values: {
      project_id: "sample-project-id",
      name: "TheApp Project",
      description: "iOS + Android strings",
      created_at: "2026-11-10 10:30:00",
      created_at_timestamp: 1762770600,
      project_type: "localization_files",
      base_language_iso: "en",
      team_id: 1234,
    },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await projectList.execute({ limit: MAX_ROWS }, ctx) as { items?: Project[] };
    const rows: Array<{ key: string; values: unknown }> = [];
    for (const p of res.items ?? []) {
      if (p.project_id === undefined || p.project_id === null) continue;
      rows.push({ key: String(p.project_id), values: p });
    }
    return await pollSnapshot({
      state,
      maxRows: MAX_ROWS,
      emit: { added: true, updated: false },
      rows,
    });
  },
};

export default trigger;
