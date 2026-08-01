import type { ActionDefinition } from "@w6w/types";
import { RedditClient } from "../lib/client.ts";

interface Identity {
  id: string;
  name: string;
  icon_img?: string;
  link_karma?: number;
  comment_karma?: number;
  created_utc?: number;
  verified?: boolean;
}

/**
 * `GET /api/v1/me` (scope: identity) —
 * github.com/reddit-archive/reddit/wiki/API#GET_api_v1_me. Returns the
 * account's own profile directly (no Listing/`data` wrapper, unlike most of
 * this app's other reads). This is also the endpoint this app's `oauth2`
 * Auth uses for `test` and `afterConnect`, and the one the derived
 * `auth:oauth2` health check exercises — it's the cheapest authenticated
 * call this app has, which is also why `health/quota.ts` reads its
 * rate-limit headers off this endpoint.
 */
const identityGet: ActionDefinition<Record<string, never>, Identity> = {
  key: "identity-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the connected account's own Reddit profile.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Username" },
    { key: "link_karma", type: "number", label: "Link karma" },
    { key: "comment_karma", type: "number", label: "Comment karma" },
  ],

  async execute(_input, ctx) {
    return await new RedditClient(ctx).request<Identity>("/api/v1/me");
  },
};

export default identityGet;
