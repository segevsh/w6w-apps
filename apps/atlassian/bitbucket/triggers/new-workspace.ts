import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listWorkspaces from "../actions/list-workspaces.ts";

const PAGELEN = 100;
const MAX_PAGES = 50;

/**
 * The workspaces the connected user belongs to are a small bounded collection: `GET
 * /2.0/user/workspaces` pages with `page` / `pagelen` (maximum 100) and a `next` link, and it
 * documents no sort or created-since filter (https://developer.atlassian.com/cloud/bitbucket/rest/intro/,
 * verified 2026-11-10). Every check reads all pages through `list-workspaces` and diffs the uuids
 * (added only); the first check only records them.
 */
const trigger: TriggerDefinition = {
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace the connected Bitbucket user newly belongs to.",
  output: [
    { key: "uuid", type: "string", label: "Workspace UUID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_on", type: "string", label: "Created on" },
  ],
  sample: {
    uuid: "{7c3b8a1e-0000-4000-8000-0123456789ab}",
    slug: "teamsinspace",
    name: "Teams in Space",
    created_on: "2026-11-10T09:00:00.000000+00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const workspaces: Array<{ uuid?: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listWorkspaces.execute({ page, pagelen: PAGELEN }, ctx) as {
        values?: Array<{ uuid?: unknown }>;
        next?: string;
      };
      workspaces.push(...(Array.isArray(out?.values) ? out.values : []));
      if (!out?.next) break;
      if (page === MAX_PAGES) {
        throw new Error(
          `Bitbucket user belongs to more than ${
            MAX_PAGES * PAGELEN
          } workspaces; refusing to snapshot them`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: workspaces.map((w) => ({ key: String(w.uuid ?? ""), values: w })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
