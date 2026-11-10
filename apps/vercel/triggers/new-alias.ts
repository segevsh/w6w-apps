import { walkTrigger } from "../lib/walk.ts";
import aliasList from "../actions/alias-list.ts";

type Alias = { uid?: unknown; alias?: unknown; createdAt?: unknown };
const createdOf = (i: unknown): number | undefined => {
  const n = Number((i as Alias).createdAt);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * `GET /v4/aliases` documents `since` ("Get aliases created after this JavaScript timestamp") and
 * no sort order (https://vercel.com/docs/rest-api/aliases/list-aliases, 2026-11-10), so this is the
 * since-filter shape: `since` = last check minus the overlap with `returnAll`, which makes the
 * action page the whole window itself (`until` = the vendor's `pagination.next`), deduped by `uid`.
 * The window is one interval wide, so one check drains it; the floor drops anything older.
 */
export default walkTrigger({
  key: "new-alias",
  title: "New Alias",
  description: "The run gets each newly created alias (a domain pointed at a deployment).",
  action: aliasList as never,
  first: ({ sinceMs }) => ({ since: sinceMs, returnAll: true }),
  next: () => undefined,
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (i) => String((i as Alias).uid ?? ""),
  stampOf: createdOf,
  output: [
    { key: "uid", type: "string", label: "Alias ID" },
    { key: "alias", type: "string", label: "Hostname" },
    { key: "deploymentId", type: "string", label: "Deployment ID" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "createdAt", type: "number", label: "Created (ms)" },
  ],
  sample: {
    uid: "2WjyKQmM8ZnGcJsPobLhHGzs",
    alias: "my-app.vercel.app",
    deploymentId: "dpl_2wQpKXz7mR9sYH3tVn8bC4eL1uAd",
    projectId: "prj_8Vq2nT5cJhXw1Zm4RkLs",
    createdAt: 1794700800000,
  },
});
