import { collectPages, snapshotTrigger } from "../lib/triggers.ts";
import listBranches from "../actions/list-branches.ts";

/**
 * Bounded collection (brief 9.1 c): a stack has a few branches; `GET /v3/stacks/branches` is
 * walked to its end through `limit` (max 100) and `skip`
 * (https://www.contentstack.com/docs/developers/apis/content-management-api , verified
 * 2026-11-10). The kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-branch",
  title: "New Branch",
  description: "The run gets each branch newly created in the stack.",
  output: [
    { key: "uid", type: "string", label: "Branch UID" },
    { key: "source", type: "string", label: "Source branch" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "feature-redesign",
    source: "main",
    created_at: "2026-11-09T10:00:00.000Z",
    updated_at: "2026-11-09T10:00:00.000Z",
  },
  fetchRows: (_params, ctx) =>
    collectPages(100, async (skip, limit) => {
      const out = await listBranches.execute({ limit, skip }, ctx) as { branches?: unknown[] };
      return out.branches ?? [];
    }),
  idOf: (row) => (row as { uid?: unknown }).uid,
});
