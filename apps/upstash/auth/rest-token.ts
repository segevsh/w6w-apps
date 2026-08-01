import type { AuthDefinition } from "@w6w/types";

/**
 * Bearer token against the database's own REST URL.
 *
 * Unlike most APIs, there is no shared host: every Upstash Redis database
 * has its own unique REST URL (`https://<db-id>.upstash.io`) alongside its
 * own token. The URL identifies which database to talk to, so — the same
 * pattern as Zendesk's per-account subdomain — it is collected here as a
 * Connection field rather than an Action param, and `afterConnect` echoes it
 * onto the connection's `display`, which `lib/client.ts` reads from. It is
 * not secret; only `restToken` is.
 */
const restToken: AuthDefinition = {
  key: "rest-token",
  type: "apiKey",
  displayName: "REST URL & Token",
  description:
    "From the Upstash console: open the database, go to the REST API panel, and copy the UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  connectionLabel: "{{restUrl}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "restUrl",
      label: "REST URL",
      type: "string",
      required: true,
      placeholder: "https://usw1-example-12345.upstash.io",
      hint: "The database's unique REST URL — UPSTASH_REDIS_REST_URL in the Upstash console.",
      validation: { pattern: "^https://[a-zA-Z0-9-]+\\.upstash\\.io/?$" },
    },
    {
      key: "restToken",
      label: "REST Token",
      type: "secret",
      required: true,
      hint: "UPSTASH_REDIS_REST_TOKEN in the Upstash console.",
    },
  ],

  sign({ request, credential }) {
    const { restToken } = credential as { restToken: string };
    request.headers["authorization"] = `Bearer ${restToken}`;
    return request;
  },

  // PING is the cheapest possible round trip and needs no scope beyond the
  // token itself: https://upstash.com/docs/redis/features/restapi documents
  // `GET /ping` -> `{"result":"PONG"}`.
  async test({ credential }, ctx) {
    const { restUrl, restToken } = credential as { restUrl?: string; restToken?: string };
    if (!restUrl || !restToken) {
      return { ok: false, message: "credential missing restUrl or restToken" };
    }
    const res = await ctx.fetch(`${restUrl.replace(/\/+$/, "")}/ping`, {
      method: "POST",
      headers: { authorization: `Bearer ${restToken}` },
    });
    if (!res.ok) return { ok: false, message: `Upstash returned ${res.status}` };
    const body = await res.json().catch(() => ({})) as { result?: string; error?: string };
    if (body.error) return { ok: false, message: body.error };
    if (body.result !== "PONG") {
      return { ok: false, message: `unexpected PING response: ${JSON.stringify(body)}` };
    }
    return { ok: true };
  },

  /** Records the REST URL on the connection so actions can build requests without the credential. */
  afterConnect({ credential }) {
    const { restUrl } = credential as { restUrl?: string };
    return { restUrl };
  },
};

export default restToken;
