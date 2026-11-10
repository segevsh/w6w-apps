import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import teamFolderList from "../actions/team-folder-list.ts";
import { teamId } from "../lib/params.ts";

const PAGE = 50;
const MAX_PAGES = 20;

// Zoho WorkDrive `GET /teams/{team_id}/teamfolders` documents `page[limit]` and `page[offset]` but
// no sort and no created filter (https://www.zoho.com/workdrive/developer/docs/api/v1/get-team-folders-in-a-team.html,
// verified 2026-11-10); listings return at most 50 per page and are paged by offset
// (https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-pagination.html). A team has
// a few dozen team folders, so each check reads them all, 50 per request until a short page, and
// diffs the ids (snapshot, brief 9.1 c); more than 1000 stops with an error rather than truncating.
const trigger: TriggerDefinition = {
  key: "new-team-folder",
  title: "New Team Folder",
  description: "The run gets each team folder newly created in the WorkDrive team.",
  params: [teamId],
  output: [
    { key: "id", type: "string", label: "Team folder ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Team folder attributes (name, created_time, …)" },
  ],
  sample: {
    id: "ly9zmacc69de0061b47ad9f09060734858fc4",
    type: "teamfolders",
    attributes: { name: "Marketing Details", created_time_in_milliseconds: 1618251055482 },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const team = String((params as { teamId?: string }).teamId ?? "");
    const byId = new Map<string, Record<string, unknown>>();
    for (let n = 0;; n++) {
      if (n >= MAX_PAGES) {
        throw new Error(
          `new-team-folder: more than ${MAX_PAGES * PAGE} team folders; too many to watch`,
        );
      }
      const res = await (teamFolderList as unknown as ActionDefinition).execute({
        teamId: team,
        limit: PAGE,
        offset: n * PAGE,
      }, ctx) as { items?: Array<Record<string, unknown>> };
      const items = res.items ?? [];
      for (const item of items) {
        byId.set(String(item.id ?? ""), {
          id: item.id,
          type: item.type,
          attributes: item.attributes,
        });
      }
      if (items.length < PAGE) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true, updated: false, removed: false },
      rows: [...byId.entries()].map(([key]) => ({ key, values: { id: key } })),
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default trigger;
