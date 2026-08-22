import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/keys` — which credentials can reach this project.
 *
 * The list an access review needs. Deepgram keys carry scopes chosen at
 * creation and never changed, so this is where a key created for one job and
 * quietly given `owner` shows up.
 *
 * Two fields decide what to do about each. **`expiration_date`** is optional —
 * a key without one lives forever, which is nearly always an oversight rather
 * than a decision. And **the key's value is never returned**, here or anywhere:
 * Deepgram shows it once at creation. That is what makes this safe to run on a
 * schedule.
 *
 * `usage-breakdown-get` grouped by accessor pairs with this: it says which of
 * these keys is actually being used, and by how much.
 */
const action: ActionDefinition = {
  key: "key-list",
  type: "read",
  resource: "key",
  title: "List API keys",
  description:
    "Which credentials reach this project and what each may do. Values are never returned — " +
    "Deepgram shows a key once — so this is safe to schedule.",
  params: [],
  output: [
    { key: "keys", type: "array", label: "Keys, without their values" },
    { key: "count", type: "number", label: "Keys returned" },
    { key: "neverExpire", type: "array", label: "Keys with no expiry — usually an oversight" },
    { key: "privileged", type: "array", label: "Keys carrying owner or admin" },
  ],

  async execute(_input, ctx) {
    const client = new DeepgramClient(ctx);
    const body = await client.request<{
      api_keys?: Array<{
        api_key?: {
          api_key_id?: string;
          comment?: string;
          scopes?: string[];
          expiration_date?: string;
        };
      }>;
    }>(`/v1/projects/${encodeURIComponent(client.projectId)}/keys`);

    const keys = body?.api_keys ?? [];
    const describe = (k: typeof keys[number]) =>
      String(k?.api_key?.comment ?? k?.api_key?.api_key_id ?? "unnamed");

    const neverExpire = keys.filter((k) => !k?.api_key?.expiration_date).map(describe);
    const privileged = keys
      .filter((k) => (k?.api_key?.scopes ?? []).some((s) => /owner|admin/i.test(s)))
      .map(describe);

    return { keys, count: keys.length, neverExpire, privileged };
  },
};

export default action;
