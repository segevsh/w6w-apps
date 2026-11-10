import { collectAll, snapshotTrigger } from "../lib/triggers.ts";
import releaseList from "../actions/release-list.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

interface Params {
  repo?: string;
  owner?: string;
}

/**
 * Bounded collection (brief 9.1 c): `GET /repos/{owner}/{repo}/releases` takes `page` and `limit`
 * and documents no sort
 * (https://docs.gitea.com/api/1.24/#tag/repository/operation/repoListReleases , verified
 * 2026-11-10), so every release is read and compared by id. Drafts are left out when the token
 * has no write access, as Gitea itself does. The kit refuses more than 5000.
 */
export default snapshotTrigger<Params>({
  key: "new-release",
  title: "New Release",
  description: "The run gets each release newly created in the chosen repository.",
  params: [REPO_PARAM, OWNER_PARAM],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "name", type: "string", label: "Name" },
    { key: "draft", type: "boolean", label: "Draft" },
    { key: "prerelease", type: "boolean", label: "Prerelease" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    id: 77,
    tag_name: "v1.4.0",
    name: "1.4.0",
    draft: false,
    prerelease: false,
    html_url: "https://git.example.test/acme/api/releases/tag/v1.4.0",
    created_at: "2026-11-09T10:00:00Z",
  },
  fetchRows: (params, ctx) =>
    collectAll((limit) => releaseList.execute({ ...params, limit }, ctx), "release list"),
  idOf: (row) => (row as { id?: unknown }).id,
});
