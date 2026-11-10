import type { ActionDefinition } from "@w6w/types";
import repoBlocklistList from "../actions/repo-blocklist-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /settings/repo-blocklists/repos` returns every repository blocklist the team configured
 * in one response (no paging in the reference), so each check diffs the blocklist ids.
 * https://cursor.com/docs/account/teams/admin-api
 */
export default snapshotTrigger({
  key: "new-repo-blocklist",
  title: "New Repo Blocklist",
  description: "The run gets each repository blocklist newly added to the Cursor team.",
  action: repoBlocklistList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { repos?: unknown[] }).repos ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Blocklist ID" },
    { key: "url", type: "string", label: "Repository URL" },
    { key: "patterns", type: "array", label: "Blocked glob patterns" },
  ],
  sample: {
    id: "blocklist-1",
    url: "https://example.com/repo",
    patterns: ["secrets/**"],
  },
});
