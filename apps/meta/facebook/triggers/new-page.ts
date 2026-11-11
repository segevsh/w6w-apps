import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import listPages from "../actions/list-pages.ts";
import { newRecords, readAllPages } from "../lib/snapshot.ts";

/**
 * The Pages a user manages are a small bounded collection (`GET /me/accounts`,
 * https://developers.facebook.com/docs/graph-api/reference/user/accounts/, 2026-11-10): every check
 * reads all pages through `list-pages` and diffs the ids (`pollSnapshot`, added only).
 *
 * The listing carries each Page's own `access_token`. It is NEVER passed on: the run gets only
 * the fields below, so a Page token cannot land in a stored trigger event.
 */
const trigger: TriggerDefinition = {
  key: "new-page",
  title: "New Page",
  description: "The run gets each Facebook Page that the connected user starts to manage.",
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "category", type: "string", label: "Category" },
    { key: "tasks", type: "array", label: "Your tasks on the Page" },
  ],
  sample: {
    id: "104059235640000",
    name: "Example Coffee",
    category: "Coffee Shop",
    tasks: ["ADVERTISE", "ANALYZE", "CREATE_CONTENT", "MANAGE", "MODERATE"],
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await readAllPages(listPages as unknown as ActionDefinition, ctx, {});
    return newRecords({
      state,
      items,
      shape: (r) => ({
        id: r.id,
        name: r.name ?? null,
        category: r.category ?? null,
        tasks: r.tasks ?? [],
      }),
    });
  },
};

export default trigger;
