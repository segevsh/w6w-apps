import type { ActionDefinition } from "@w6w/types";
import { API_HOST, describeCloudError } from "../lib/client.ts";

/**
 * `GET /v1/organizations` — the organisation this key belongs to.
 *
 * An API key is created inside one organisation and can see that one, so this
 * almost always returns exactly one result. It exists because the id is a UUID
 * that every other control-plane path needs, and because it is the cheapest
 * call that proves the key still works.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "The organisation this API key belongs to — almost always exactly one, because a key is " +
    "created inside one. Its UUID is what every other control-plane path needs.",
  params: [],
  output: [
    { key: "organizations", type: "array", label: "The organisations" },
    { key: "count", type: "number", label: "How many" },
    { key: "id", type: "string", label: "The id, when exactly one was returned" },
    { key: "name", type: "string", label: "Its name" },
  ],

  async execute(_input, ctx) {
    const res = await ctx.fetch(`${API_HOST}/v1/organizations`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      // This is the one path above the organisation, so it does not go through
      // `CloudClient` — which prefixes every request with an organisation id.
      throw new Error(
        `ClickHouse Cloud ${res.status} for GET /v1/organizations: ${
          describeCloudError(res.status, text)
        }`,
      );
    }
    const body = JSON.parse(text) as { result?: Array<{ id?: string; name?: string }> };
    const organizations = body?.result ?? [];

    return {
      organizations,
      count: organizations.length,
      id: organizations.length === 1 ? organizations[0]?.id : undefined,
      name: organizations.length === 1 ? organizations[0]?.name : undefined,
    };
  },
};

export default action;
