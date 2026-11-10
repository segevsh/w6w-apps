import { walkTrigger } from "../lib/walk.ts";
import deploymentList from "../actions/deployment-list.ts";

const PAGE = 100;
type Deployment = { uid?: unknown; id?: unknown; created?: unknown; createdAt?: unknown };
const createdOf = (i: unknown): number | undefined => {
  const x = i as Deployment;
  const n = Number(x.created ?? x.createdAt);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Vercel's list documents no sort order, only `since` ("Get Deployments created after this
 * JavaScript timestamp") and `until`, per
 * https://vercel.com/docs/rest-api/deployments/list-deployments. So this is the since-filter shape:
 * `since` = last check minus the overlap, a longer window pages on with `until` = the oldest
 * `created` read, and the dedupe is by deployment id.
 */
export default walkTrigger({
  key: "new-deployment",
  title: "New Deployment",
  description: "The run gets each newly created deployment.",
  action: deploymentList as never,
  first: ({ sinceMs }) => ({ since: sinceMs, limit: PAGE }),
  next: (req, _result, got) => {
    if (got.length < PAGE) return undefined;
    const oldest = Math.min(...got.map((i) => createdOf(i) ?? Infinity));
    return Number.isFinite(oldest) ? { ...req, until: oldest } : undefined;
  },
  items: (r) => Array.isArray(r) ? r : (r as { deployments?: unknown[] }).deployments ?? [],
  idOf: (i) => String((i as Deployment).uid ?? (i as Deployment).id ?? ""),
  stampOf: createdOf,
  output: [
    { key: "uid", type: "string", label: "Deployment ID" },
    { key: "name", type: "string", label: "Project name" },
    { key: "url", type: "string", label: "Deployment URL" },
    { key: "state", type: "string", label: "State" },
    { key: "created", type: "number", label: "Created (ms)" },
  ],
  sample: {
    uid: "dpl_2wQpKXz7mR9sYH3tVn8bC4eL1uAd",
    name: "my-app",
    url: "my-app-abc123.vercel.app",
    state: "READY",
    created: 1794700800000,
  },
});
