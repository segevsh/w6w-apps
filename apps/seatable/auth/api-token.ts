import type { AuthDefinition } from "@w6w/types";
import { ACCESS_TOKEN_URL, describeError, GATEWAY, HOST, ORIGIN } from "../lib/client.ts";

/**
 * SeaTable API token → Base-Token.
 *
 * Verified 2026-10-06 against the API reference ("Authentication" and "Get
 * Base-Token with API-Token") and live probes against `cloud.seatable.io`.
 *
 * ## Why this is a two-step credential
 *
 * A SeaTable **API-Token** is created for ONE base, with read or read/write
 * permission, and never expires. But it cannot call the base endpoints: those
 * (`/api-gateway/api/v2/dtables/{base_uuid}/…`) take a **Base-Token**, minted
 * from the API-Token with `GET /api/v2.1/dtable/app-access-token/` and valid for
 * three days (the `exp` query parameter would change that; this app uses the
 * default). The exchange response also carries the base's `dtable_uuid`, which
 * every base URL needs — so the connection learns which base it is for from the
 * token alone, and no Action takes a base id.
 *
 * `sign` is network-less, so it cannot do the exchange. The shape is therefore
 * the same as any short-lived-token app: `exchange` mints at connect time and
 * stores `{apiToken, accessToken, dtableUuid, …, expiresAt}`; `refresh` mints
 * again from the stored API-Token; `sign` stamps `Authorization: Bearer
 * <accessToken>`.
 *
 * ## The probe is a signed base call, not the exchange
 *
 * `GET /app-access-token/` answers with the Base-Token itself, which is a
 * credential — it is called only from `exchange`/`refresh`, whose result is
 * stored encrypted and never displayed. The liveness probe is
 * `GET …/dtables/{uuid}/metadata/`, the structure-only call the vendor's own
 * quick-start uses first. It needs only read permission and returns no secret.
 *
 * A bad token is answered 403 by both families, with different spellings:
 * `{"error_msg":"Permission denied."}` from the exchange and
 * `{"error_message":"invalid token"}` from the gateway (both measured live).
 * Classification therefore reads the body, not the status.
 *
 * ## Cloud only
 *
 * The exchange returns `dtable_server`. On Cloud it is
 * `https://cloud.seatable.io/api-gateway/`; for any other host this app refuses
 * the credential rather than silently failing on a blocked request.
 */
export interface SeaTableCredential {
  apiToken: string;
  accessToken: string;
  dtableUuid: string;
  dtableName?: string;
  workspaceId?: number;
  permission?: string;
  expiresAt: string;
}

/** Margin before the Base-Token's real expiry at which the host should renew it. */
const EARLY_MS = 60 * 60 * 1000;
/** Vendor default lifetime of a Base-Token ("three days"), used if the JWT has no `exp`. */
const DEFAULT_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

interface JwtClaims {
  exp?: number;
  permission?: string;
}

/** Read the claims of a Base-Token (a JWT) without verifying it — it is our own token. */
export function decodeClaims(token: string): JwtClaims {
  try {
    const payload = token.split(".")[1] ?? "";
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return {};
  }
}

export function expiryOf(accessToken: string, now = Date.now()): string {
  const exp = decodeClaims(accessToken).exp;
  const ms = typeof exp === "number" ? exp * 1000 : now + DEFAULT_LIFETIME_MS;
  return new Date(Math.max(now, ms - EARLY_MS)).toISOString();
}

interface AccessTokenResponse {
  access_token?: string;
  dtable_uuid?: string;
  dtable_server?: string;
  dtable_name?: string;
  workspace_id?: number;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Exchange an API-Token for a Base-Token. Called only from `exchange` and `refresh`. */
export async function mint(apiToken: string, fetchImpl: Fetch): Promise<SeaTableCredential> {
  const res = await fetchImpl(ACCESS_TOKEN_URL, {
    headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `SeaTable ${describeError(res.status, text)} exchanging the API token for a Base-Token` +
        (res.status === 403
          ? " — check the token was copied exactly and has not been deleted"
          : ""),
    );
  }

  let body: AccessTokenResponse;
  try {
    body = JSON.parse(text) as AccessTokenResponse;
  } catch {
    throw new Error(`SeaTable did not return a Base-Token: ${text.slice(0, 160)}`);
  }
  if (!body.access_token || !body.dtable_uuid) {
    throw new Error("SeaTable returned no `access_token`/`dtable_uuid` for this API token");
  }

  const server = (() => {
    try {
      return new URL(body.dtable_server ?? "");
    } catch {
      return null;
    }
  })();
  if (!server || server.host !== HOST) {
    throw new Error(
      `this base is served from ${server?.host ?? "an unknown host"}, not ${HOST}. Only SeaTable ` +
        "Cloud is supported.",
    );
  }

  return {
    apiToken,
    accessToken: body.access_token,
    dtableUuid: body.dtable_uuid,
    dtableName: body.dtable_name,
    workspaceId: body.workspace_id,
    permission: decodeClaims(body.access_token).permission,
    expiresAt: expiryOf(body.access_token),
  };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "custom",
  displayName: "API Token",
  description:
    "The API Token of one SeaTable Cloud base. In the base: the three dots next to the base " +
    "name > Advanced > API Token. Read-only tokens work for the read actions; writes need a " +
    "read/write token. The token is exchanged for a Base-Token, which this app renews itself.",
  connectionLabel: "{{baseName}}",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Base > Advanced > API Token > + Add token. A token belongs to one base, so a " +
        "connection is for one base.",
    },
  ],

  async exchange({ fields }, ctx) {
    const token = String((fields as Record<string, unknown>)?.apiToken ?? "").trim();
    if (!token) throw new Error("`apiToken` is required");
    return await mint(token, ctx.fetch);
  },

  async refresh({ credential }, ctx) {
    const token = String((credential as Partial<SeaTableCredential>)?.apiToken ?? "");
    if (!token) throw new Error("the stored credential has no API token — reconnect");
    return await mint(token, ctx.fetch);
  },

  /** The only hook handed the raw credential, and it is network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<SeaTableCredential>;
    request.headers["authorization"] = `Bearer ${cred.accessToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<SeaTableCredential>;
    if (!cred?.accessToken || !cred?.dtableUuid) {
      return { ok: false, message: "credential is missing the Base-Token — reconnect" };
    }
    const url = `${GATEWAY}/dtables/${encodeURIComponent(cred.dtableUuid)}/metadata/`;

    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach ${ORIGIN}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (res.ok) {
      let shaped = false;
      try {
        shaped = Array.isArray(
          (JSON.parse(text) as { metadata?: { tables?: unknown } })?.metadata?.tables,
        );
      } catch { /* not JSON — handled below */ }
      return shaped
        ? { ok: true, message: `base "${cred.dtableName ?? cred.dtableUuid}" is reachable` }
        : { ok: false, message: "SeaTable answered 200 but not with base metadata" };
    }

    let reason = "";
    try {
      const body = JSON.parse(text) as { error_message?: string; error_msg?: string };
      reason = String(body.error_message ?? body.error_msg ?? "");
    } catch { /* leave empty */ }
    if (/invalid token|expired|permission denied/i.test(reason) || res.status === 401) {
      return {
        ok: false,
        message: `SeaTable rejected the Base-Token (${describeError(res.status, text)}). ` +
          "Reconnect with a valid API token; the base's API token may have been deleted.",
      };
    }
    return { ok: false, message: `SeaTable ${describeError(res.status, text)}` };
  },

  /** Publish the base's id, name and the token's permission — never the tokens. */
  afterConnect({ credential }) {
    const cred = credential as Partial<SeaTableCredential>;
    return {
      baseUuid: cred.dtableUuid ?? "",
      baseName: cred.dtableName ?? cred.dtableUuid ?? "SeaTable base",
      workspaceId: cred.workspaceId,
      permission: cred.permission,
    };
  },
};

export default apiToken;
