import type { AuthDefinition } from "@w6w/types";
import {
  API_HOSTS,
  baseUrl,
  DEFAULT_ENVIRONMENT,
  environment,
  hostForEnvironment,
  SQUARE_VERSION,
} from "../lib/client.ts";

/**
 * Access Token (`bearer`).
 *
 * Square documents exactly two credential shapes for the Connect v2 API, and
 * both are presented identically on the wire — `Authorization: Bearer <token>`:
 *
 *   - a **personal access token**, minted for your own Square account in the
 *     Developer Console (Credentials -> Access token). Unscoped: it can reach
 *     everything the account can. This is what this method collects.
 *   - an **OAuth access token**, obtained by walking a seller through Square's
 *     authorization-code flow and scoped to the permissions they granted. That
 *     is the right credential for a multi-merchant integration, and it is NOT
 *     implemented here — an OAuth method would need this app to be registered
 *     as a Square application with a redirect URL, which is deployment
 *     configuration rather than app code. The endpoints, for whoever adds it,
 *     are `/oauth2/authorize` and `/oauth2/token` on the SAME host as the API
 *     (so `connect.squareupsandbox.com` for a sandbox app), exported as
 *     `OAUTH_AUTHORIZE_PATH` / `OAUTH_TOKEN_PATH` from lib/client.ts.
 *
 * Because both are bearer tokens, an OAuth-issued token pasted here works
 * today; it is simply scoped, so a call needing a permission the seller did not
 * grant fails with `AUTHENTICATION_ERROR` / `INSUFFICIENT_SCOPES`.
 *
 * ## Why `environment` is collected here
 *
 * Square's sandbox is a different HOST (`connect.squareupsandbox.com`), and a
 * token is minted for exactly one of the two — cross-presenting fails with
 * `UNAUTHORIZED`. So the environment describes the CREDENTIAL, not the call. It
 * is collected once here and echoed onto the Connection's redacted `display` by
 * `afterConnect`, which is where `lib/client.ts` reads it from. An Action gets
 * the right host without ever seeing the credential, and cannot point a live
 * token at the sandbox by passing the wrong param.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste an access token from the Square Developer Console (Credentials -> Access token), then pick the environment it was minted for. An OAuth-issued seller token works here too.",
  connectionLabel: "{{merchant.business_name}} ({{environment}})",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Developer Console -> your application -> Credentials. Production tokens start with `EAAA`; sandbox tokens with `EAAAE`.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      default: DEFAULT_ENVIRONMENT,
      hint:
        "Which Square host this token was minted for. A sandbox token presented to production (or the reverse) fails with UNAUTHORIZED.",
      options: [
        { value: "production", label: `Production (${API_HOSTS.production})` },
        { value: "sandbox", label: `Sandbox (${API_HOSTS.sandbox})` },
      ],
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v2/merchants/me` — the merchant whoami.
   *
   * Chosen over `GET /v2/locations` because it is the cheapest read that a
   * legitimately narrow credential can still reach: it needs only
   * `MERCHANT_PROFILE_READ`, which every seller grants for the integration to
   * identify them at all, whereas Locations needs `MERCHANT_PROFILE_READ` too
   * but returns far more, and a payments-only token is a real shape. `me` is
   * Square's documented alias for "the merchant this token belongs to".
   */
  async test({ credential }, ctx) {
    const { accessToken, environment: env } = credential as {
      accessToken?: string;
      environment?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${baseUrl(hostForEnvironment(env))}/merchants/me`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "square-version": SQUARE_VERSION,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as
        | { errors?: Array<{ detail?: string; code?: string }> }
        | null;
      const first = body?.errors?.[0];
      return {
        ok: false,
        message: first?.detail ?? first?.code ?? `Square returned HTTP ${res.status}`,
      };
    }
    return { ok: true };
  },

  /**
   * Records the environment on the Connection so every Action can resolve the
   * host without the credential, plus the merchant for the connection label.
   */
  async afterConnect({ credential }, ctx) {
    const { environment: env } = credential as { environment?: string };
    const resolved = environment(env);
    const res = await ctx.fetch(`${baseUrl(API_HOSTS[resolved])}/merchants/me`, {
      headers: { accept: "application/json", "square-version": SQUARE_VERSION },
    });
    if (!res.ok) return { environment: resolved, apiHost: API_HOSTS[resolved] };
    const body = await res.json().catch(() => ({})) as {
      merchant?: Record<string, unknown>;
    };
    return {
      environment: resolved,
      apiHost: API_HOSTS[resolved],
      merchant: body.merchant ?? {},
    };
  },
};

export default accessToken;
