import { type Region, REGIONS } from "../lib/client.ts";

/**
 * The wire format shared by `sign`, `test` and `afterConnect`, so the probe sends exactly the
 * headers real requests carry — a hand-rolled second copy is how a probe ends up passing for a
 * connection that fails in use.
 *
 * `asUser` exists only on the client-credentials method: Ironclad requires `x-as-user-email` or
 * `x-as-user-id` on every request made with a client-credentials token ("The request scope and
 * context will be in respect to the included user"). An authorization-code token is already bound
 * to the consenting user.
 */
export interface IroncladCredential {
  accessToken?: string;
  asUser?: string;
  region?: string;
}

/** An email address goes in `x-as-user-email`; anything else is treated as a user id. */
export function asUserHeaders(asUser: string | undefined): Record<string, string> {
  const v = (asUser ?? "").trim();
  if (!v) return {};
  return v.includes("@") ? { "x-as-user-email": v } : { "x-as-user-id": v };
}

export function authHeaders(credential: IroncladCredential): Record<string, string> {
  return {
    authorization: `Bearer ${credential.accessToken ?? ""}`,
    ...asUserHeaders(credential.asUser),
  };
}

/** What `GET /oauth/userinfo` returns, minus nothing — it carries no credential material. */
export interface UserInfo {
  sub?: string;
  id?: string;
  email?: string;
  username?: string;
  displayName?: string;
  companyId?: string;
  companyName?: string;
  scopes?: string[];
}

export interface ProbeResult {
  ok: boolean;
  message?: string;
  info?: UserInfo;
}

/**
 * `GET {host}/oauth/userinfo` — "Retrieve Token User Info".
 *
 * Chosen as the credential probe because it is the one authenticated read that needs **no resource
 * scope** (its OpenAPI `security` is empty), so the narrowest usable token still reaches it, and
 * its body is the token's own user and scopes — never the token. A resource read such as
 * `GET /workflows` would report a connection granted only record scopes as broken.
 *
 * Classified by the body's `code`, not the status: an unauthenticated or invalid bearer returns
 * `401 {"code":"UNAUTHORIZED","message":"invalid authentication token"}`, and Ironclad returns that
 * same 401 for *any* path under `/public/api/v1` — a 401 proves nothing about whether a route
 * exists, only about the token.
 */
export async function probeUserInfo(
  region: Region,
  credential: IroncladCredential,
  ctx: { fetch: typeof fetch },
): Promise<ProbeResult> {
  const url = `https://${REGIONS[region].host}/oauth/userinfo`;
  let res: Response;
  try {
    res = await ctx.fetch(url, {
      headers: { accept: "application/json", ...authHeaders(credential) },
    });
  } catch (err) {
    return { ok: false, message: `could not reach ${REGIONS[region].host}: ${String(err)}` };
  }
  const text = await res.text().catch(() => "");
  let body: { code?: string; message?: string } & UserInfo = {};
  try {
    body = JSON.parse(text);
  } catch { /* leave empty */ }

  if (res.ok && (body.id || body.sub)) return { ok: true, info: body };
  if (body.code === "UNAUTHORIZED" || res.status === 401) {
    return {
      ok: false,
      message: `Ironclad rejected the access token (${body.message ?? "401"}). Reconnect this ` +
        "connection; if it is a client-credentials connection, check the client is still enabled.",
    };
  }
  if (res.ok) {
    return { ok: false, message: "Ironclad answered 200 but not with a userinfo body" };
  }
  return {
    ok: false,
    message: `Ironclad returned HTTP ${res.status}${body.code ? ` ${body.code}` : ""}${
      body.message ? `: ${body.message}` : ""
    }`,
  };
}

/** The display data every method records, so Actions can find the right host. */
export function displayFrom(region: Region, info: UserInfo | undefined): Record<string, unknown> {
  return {
    region,
    regionLabel: REGIONS[region].label,
    companyName: info?.companyName,
    userEmail: info?.email,
    userName: info?.displayName ?? info?.username,
  };
}
