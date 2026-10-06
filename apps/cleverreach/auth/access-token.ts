import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, describeError, errorOf, PROBE_PATH } from "../lib/client.ts";

export interface AccessTokenCredential {
  accessToken: string;
}

/**
 * A pasted REST API access token.
 *
 * Create an OAuth app under **Account → Extras → REST API**, then use its "Test Process Now"
 * button to receive a token (vendor guide: developers.cleverreach.com/docs/guides/authentication).
 * Tokens are tied to ONE CleverReach account and grant full control over its data. The vendor's
 * sample response shows `expires_in: 31536000` (a year); when it lapses, paste a new one — or use
 * the `client-credentials` method, which renews it itself.
 */
/**
 * The credential probe: `GET /v3/debug/ttl` ("Retrieve the ttl of the token").
 *
 * It needs no scope, mutates nothing and answers about the token alone. Its 200 body is
 * undocumented (the Swagger types it as a bare `string`), so this never reads it — and never
 * echoes it — and decides only from the vendor's own error body, with the status as a hint. An
 * unsigned call answers `401 {"error":{"code":401,"message":"Unauthorized"}}` (measured
 * 2026-10-06), which is how a bad token reads too.
 */
export async function probeToken(
  accessToken: string,
  ctx: Pick<HookContext, "fetch">,
): Promise<{ ok: boolean; message?: string }> {
  const token = accessToken.trim();
  if (!token) return { ok: false, message: "credential has no access token" };
  let res: Response;
  try {
    res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return { ok: false, message: `could not reach rest.cleverreach.com: ${String(err)}` };
  }
  const text = await res.text().catch(() => "");
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch { /* an empty or non-JSON body carries no vendor error */ }
  if (errorOf(payload) !== undefined || !res.ok) {
    return { ok: false, message: describeError(res.status, text) };
  }
  return { ok: true };
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access token",
  description:
    "A CleverReach REST API access token. Account → Extras → REST API → create an OAuth app → " +
    '"Test Process Now" returns a token. It controls the whole account, so treat it like a password.',
  connectionLabel: "CleverReach",
  fields: [
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Account → Extras → REST API. The token expires (the vendor's example is one year); " +
        "use the client-credentials method to have it renewed automatically.",
    },
  ],

  // The only code handed the credential. Network-less: stamp and return.
  sign({ request, credential }) {
    const token = String((credential as Partial<AccessTokenCredential>)?.accessToken ?? "");
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    return await probeToken(
      String((credential as Partial<AccessTokenCredential>)?.accessToken ?? ""),
      ctx,
    );
  },
};

export default accessToken;
