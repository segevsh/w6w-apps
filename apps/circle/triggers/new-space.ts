import type { TriggerDefinition } from "@w6w/types";
import spaceList from "../actions/space-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * A community's spaces are a small bounded collection (Circle itself advises caching them as a
 * static dataset) and GET /spaces has no newest-created sort, so every check reads all pages
 * through `space-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api-headless.circle.so/api/admin/v2/swagger.yaml (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-space",
  title: "New Space",
  description: "The run gets each space newly created in your Circle community.",
  output: [
    { key: "id", type: "number", label: "Space ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "space_type", type: "string", label: "Space type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 12,
    name: "Announcements",
    space_type: "basic",
    created_at: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(spaceList, {}, ctx) });
  },
};

export default trigger;
