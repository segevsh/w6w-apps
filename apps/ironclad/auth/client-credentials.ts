import type { AuthDefinition, HookContext } from "@w6w/types";
import {
  normalizeRegion,
  oauthBase,
  type Region,
  REGION_OPTIONS,
  SCOPES,
  truncate,
} from "../lib/client.ts";
import { authHeaders, displayFrom, type IroncladCredential, probeUserInfo } from "./credential.ts";

/**
 * OAuth 2.0 Client Credentials Grant — a service identity acting as a named user.
 *
 * Verified 2026-10-06 against `developer.ironcladapp.com/reference/client-credentials-grant` and
 * `authenticate-a-request`, and against live token requests:
 *
 *  - `POST {host}/oauth/token`, `grant_type=client_credentials`, plus `scope`, `client_id` and
 *    `client_secret` (body or HTTP Basic). Tokens last 6 hours and **no refresh token is issued** —
 *    the grant is simply repeated, which is what `refresh` does here.
 *  - The token is scoped to a company, not a user, so every request must also carry
 *    `x-as-user-email` or `x-as-user-id`; Ironclad then applies *that user's* permissions. `sign`
 *    stamps it from the stored `asUser` field. A service identity can therefore never do more than
 *    the user it acts as.
 *
 * ## What a wrong secret looks like
 *
 * Measured live: a malformed `client_id` answers `400 invalid_request` ("expected type UUID or
 * HTTPS URL"), while a well-formed but unknown client or wrong secret answers
 * **`403 {"error":"unauthorized_client","error_description":"unauthorized"}`** — not 401 and not
 * RFC 6749's usual `invalid_client`. Failures are therefore reported from the body's `error` and
 * `error_description`, never inferred from the status.
 *
 * `type: "custom"` because the pack's `oauth2` type models the browser redirect flow.
 */

const GRANT_ERROR_HINTS: Record<string, string> = {
  unauthorized_client:
    "Ironclad does not recognise this client id / secret for the chosen environment (a wrong " +
    "secret, a client from another environment, or one without the Client Credentials grant " +
    "enabled all answer this way)",
  invalid_request: "Ironclad rejected the request parameters",
  invalid_scope: "one of the requested scopes is not registered on this OAuth client",
};

async function mint(
  ctx: HookContext,
  c: { region: Region; clientId: string; clientSecret: string; asUser: string; scope: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(`${oauthBase(c.region)}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: c.clientId,
      client_secret: c.clientSecret,
      scope: c.scope,
    }).toString(),
  });
  const text = await res.text().catch(() => "");
  let body: {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  } = {};
  try {
    body = JSON.parse(text);
  } catch { /* leave empty */ }

  if (!res.ok || !body.access_token) {
    const hint = body.error ? GRANT_ERROR_HINTS[body.error] : undefined;
    throw new Error(
      `Ironclad token request failed (${res.status}${body.error ? ` ${body.error}` : ""}): ${
        [hint, body.error_description].filter(Boolean).join(" — ") ||
        truncate(text || "no access_token in response", 300)
      }`,
    );
  }
  return {
    region: c.region,
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    asUser: c.asUser,
    scope: c.scope,
    accessToken: body.access_token,
    grantedScope: body.scope,
    // Trust the live `expires_in` (documented as 21600); a minute of headroom absorbs clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 21600) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client credentials (service identity)",
  description:
    "An OAuth client's id and secret from Ironclad Company Settings > API, acting as a named " +
    "user. No browser sign-in, so it works in scheduled runs. The client needs the Client " +
    "Credentials grant enabled and the resource scopes below registered.",
  connectionLabel: "Ironclad — {{companyName}} as {{userEmail}} ({{regionLabel}})",
  fields: [
    {
      key: "region",
      label: "Environment",
      type: "select",
      required: true,
      default: "us",
      options: REGION_OPTIONS,
      hint: "Where your Ironclad account lives. The environments are separate stacks; a client " +
        "from one does not work on another.",
    },
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "clientSecret", label: "Client secret", type: "secret", required: true },
    {
      key: "asUser",
      label: "Act as user",
      type: "string",
      required: true,
      placeholder: "jane.doe@example.com",
      hint: "Email address or Ironclad user ID. Every request is made with that user's " +
        "permissions, so use a user who can see the workflows and records you need.",
    },
    {
      key: "scopes",
      label: "Scopes",
      type: "text",
      default: SCOPES.join(" "),
      hint: "Space-separated. Must be a subset of the scopes registered on the OAuth client — " +
        "trim this list if the client does not have them all, at the cost of the Actions that " +
        "need the removed ones.",
    },
  ],

  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    const asUser = String(f.asUser ?? "").trim();
    if (!clientId || !clientSecret) throw new Error("Client ID and Client secret are required.");
    if (!asUser) {
      throw new Error(
        "`Act as user` is required: Ironclad rejects client-credentials requests that do not " +
          "name a user (x-as-user-email / x-as-user-id).",
      );
    }
    const scope = String(f.scopes ?? "").trim().split(/\s+/).filter(Boolean).join(" ") ||
      SCOPES.join(" ");
    return mint(ctx, { region: normalizeRegion(f.region), clientId, clientSecret, asUser, scope });
  },

  /** No refresh token exists for this grant; repeat it. */
  refresh({ credential }, ctx) {
    const c = credential as Record<string, string>;
    return mint(ctx, {
      region: normalizeRegion(c.region),
      clientId: c.clientId ?? "",
      clientSecret: c.clientSecret ?? "",
      asUser: c.asUser ?? "",
      scope: c.scope ?? SCOPES.join(" "),
    });
  },

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as IroncladCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** Userinfo with the real `x-as-user-*` header, so a mistyped user fails here, not in a flow. */
  async test({ credential }, ctx) {
    const cred = credential as IroncladCredential;
    if (!cred?.accessToken) return { ok: false, message: "credential has no accessToken" };
    const result = await probeUserInfo(normalizeRegion(cred.region), cred, ctx);
    return { ok: result.ok, message: result.message };
  },

  async afterConnect({ credential }, ctx) {
    const cred = credential as IroncladCredential;
    const region = normalizeRegion(cred.region);
    const result = await probeUserInfo(region, cred, ctx);
    return displayFrom(region, result.info);
  },
};

export default clientCredentials;
