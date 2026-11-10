import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import repoSearch from "../actions/repo-search.ts";

/**
 * Newest-first (brief 9.1 a): `GET /repos/search` takes `sort=created` and `order=desc`
 * (https://docs.gitea.com/api/1.24/#tag/repository/operation/repoSearch , verified 2026-11-10),
 * and `page`/`limit`. It lists every repository the token can see, so the organisation lists
 * (`org-repo-list`) deliver the same records.
 */
export default pollFromListAction<Record<string, unknown>>({
  key: "new-repo",
  title: "New Repository",
  description: "The run gets each repository newly created and visible to the connection.",
  action: repoSearch as unknown as ActionDefinition,
  input: () => ({ sort: "created", order: "desc", limit: 50 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Repository ID" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "private", type: "boolean", label: "Private" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    id: 301,
    full_name: "acme/api",
    private: true,
    html_url: "https://git.example.test/acme/api",
    created_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
