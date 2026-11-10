import { collectPages, snapshotTrigger } from "../lib/triggers.ts";
import listReleases from "../actions/list-releases.ts";

/**
 * Bounded collection (brief 9.1 c): a stack has a handful of releases; `GET /v3/releases` is walked
 * to its end through `limit` (max 100) and `skip`
 * (https://www.contentstack.com/docs/developers/apis/content-management-api , verified
 * 2026-11-10). The kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-release",
  title: "New Release",
  description: "The run gets each release newly created in the stack.",
  output: [
    { key: "uid", type: "string", label: "Release UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "bltr0123456789abcdef",
    name: "Winter launch",
    description: "Content for the winter launch",
    created_at: "2026-11-09T10:00:00.000Z",
    updated_at: "2026-11-09T10:00:00.000Z",
  },
  fetchRows: (_params, ctx) =>
    collectPages(100, async (skip, limit) => {
      const out = await listReleases.execute({ limit, skip }, ctx) as { releases?: unknown[] };
      return out.releases ?? [];
    }),
  idOf: (row) => (row as { uid?: unknown }).uid,
});
