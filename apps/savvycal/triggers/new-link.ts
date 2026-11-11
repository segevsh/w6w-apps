import type { TriggerDefinition } from "@w6w/types";
import linkList from "../actions/link-list.ts";
import { newRecords, readAllPages } from "../lib/snapshot.ts";

/**
 * A user's scheduling links are a small bounded collection with no created-at stamp or sort
 * (`GET /v1/links`, https://api.savvycal.com/v1/spec, 2026-11-10): every check reads all pages
 * through `link-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-link",
  title: "New Scheduling Link",
  description: "The run gets each scheduling link that appears on the SavvyCal account.",
  output: [
    { key: "id", type: "string", label: "Link ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "state", type: "string", label: "State" },
    { key: "default_duration", type: "number", label: "Default duration (minutes)" },
    { key: "scope", type: "object", label: "Scope (team)" },
  ],
  sample: {
    id: "link_01J5KC2G3MHPCECSQ6KM6FMDPC",
    name: "30 Minute Meeting",
    slug: "30min",
    state: "active",
    default_duration: 30,
    scope: { id: "scope_01J5KC4R7NHQFGT8V2WD9Y8H6X", name: "Sales Team", slug: "sales" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(linkList, ctx) });
  },
};

export default trigger;
