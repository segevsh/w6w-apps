import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /location.list` — where roles are based.
 *
 * The same job as `department-list` on the other axis: `job-posting-list`
 * filters by location **name**, case-sensitively, so the exact strings have to
 * come from somewhere.
 *
 * `includeLocationHierarchy` is the parameter worth turning on for anything
 * regional. Ashby groups locations into regions, and without the hierarchy a
 * "roles in EMEA" report has to hard-code which cities count — which is wrong
 * the moment somebody opens an office.
 */
const action: ActionDefinition = {
  key: "location-list",
  type: "read",
  resource: "location",
  title: "List locations",
  description:
    "Where roles are based, optionally with Ashby's regions. Without the hierarchy a 'roles in " +
    "EMEA' report has to hard-code its cities, and is wrong the day an office opens.",
  params: [
    {
      key: "includeLocationHierarchy",
      label: "Include Regions",
      type: "boolean",
      default: true,
      hint: "Returns the region each location belongs to.",
    },
    { key: "includeArchived", label: "Include Archived", type: "boolean", default: false },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "locations", type: "array", label: "Locations" },
    { key: "count", type: "number", label: "Locations returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "location.list",
      compact({
        syncToken: p.syncToken,
        includeArchived: p.includeArchived === true ? true : undefined,
        includeLocationHierarchy: p.includeLocationHierarchy === undefined
          ? true
          : p.includeLocationHierarchy === true,
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { locations: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
