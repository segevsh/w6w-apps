import { snapshotFeed } from "../lib/triggers.ts";
import keyList from "../actions/key-list.ts";

type Item = Record<string, unknown>;

/**
 * `GET /v1/projects/{project_id}/keys` — the project's API keys, unpaginated. Deepgram never
 * returns a key's value after creation, so the event carries only the key's id, comment, scopes
 * and creation time.
 */
export default snapshotFeed({
  key: "new-api-key",
  title: "New API Key",
  description: "The run gets each API key newly created on the connected Deepgram project.",
  action: keyList,
  items: (result) => (result as { keys?: Item[] }).keys ?? [],
  idOf: (item) => String((item.api_key as Item | undefined)?.api_key_id ?? ""),
  output: [
    { key: "api_key", type: "object", label: "Key (api_key_id, comment, scopes, created)" },
    { key: "member", type: "object", label: "Member who owns the key (member_id, email)" },
  ],
  sample: {
    api_key: {
      api_key_id: "key-sample-1",
      comment: "ci pipeline",
      scopes: ["usage:write"],
      created: "2026-11-09T10:00:00Z",
    },
    member: { member_id: "member-sample-1", email: "dev@example.com" },
  },
});
