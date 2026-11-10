import { collectAll, snapshotTrigger } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

interface Params {
  repo?: string;
  owner?: string;
}

/**
 * Bounded collection (brief 9.1 c): `GET /repos/{owner}/{repo}/tags` takes `page` and `limit`
 * (default maximum page size 50) and documents no sort
 * (https://docs.gitea.com/api/1.24/#tag/repository/operation/repoListTags , verified
 * 2026-11-10), so every tag is read and compared by name. The kit refuses more than 5000.
 */
export default snapshotTrigger<Params>({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each git tag newly created in the chosen repository.",
  params: [REPO_PARAM, OWNER_PARAM],
  output: [
    { key: "name", type: "string", label: "Tag name" },
    { key: "id", type: "string", label: "Tag object ID" },
    { key: "message", type: "string", label: "Message" },
    { key: "commit", type: "object", label: "Tagged commit" },
  ],
  sample: {
    name: "v1.4.0",
    id: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
    message: "Release 1.4.0",
    commit: { sha: "3f2a9c1d5e7b4a6c8d0e1f2a3b4c5d6e7f8a9b0c" },
  },
  fetchRows: (params, ctx) =>
    collectAll((limit) => tagList.execute({ ...params, limit }, ctx), "tag list"),
  idOf: (row) => (row as { name?: unknown }).name,
});
