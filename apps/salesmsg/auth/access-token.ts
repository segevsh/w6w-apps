import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, isCredentialRefusal, parseErrorBody } from "../lib/client.ts";

export interface SalesmsgCredential {
  token: string;
}

/** The only place the credential becomes a header. */
export function authHeaders(credential: Partial<SalesmsgCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/**
 * `GET /user` — "Get Current User" (scope `users:read`). Answers the caller's own profile (name,
 * email, inbox ids); the document lists no field that carries the token, and a Personal Access
 * Token is never returned by any read. The credential's validity is read from the body: a
 * JSON object means live, an error body whose wording refuses the token means rejected.
 */
export const PROBE_PATH = "/user";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "A Personal Access Token from Salesmsg (Settings > Developer > Access Tokens), sent as " +
    "`Authorization: Bearer <token>`. It acts as the user who created it.",
  connectionLabel: "Salesmsg",
  fields: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Create one in Salesmsg under Settings > Developer > Access Tokens. Use a token " +
        "dedicated to this connection so it can be revoked on its own.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<SalesmsgCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<SalesmsgCredential>)?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ token }) },
      });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${API_BASE} to check the token — this is not a statement ` +
          `about the credential: ${String(err)}`,
      };
    }

    const text = await res.text().catch(() => "");
    const body = parseErrorBody(text);

    if (res.ok) {
      if (body) return { ok: true };
      return {
        ok: false,
        message: `Salesmsg answered ${res.status} for ${PROBE_PATH} without a user object, so ` +
          "the endpoint no longer proves the token is live",
      };
    }

    if (isCredentialRefusal(res.status, body)) {
      return {
        ok: false,
        message:
          `Salesmsg rejected the token (${res.status}${
            body?.message ? `: ${body.message}` : ""
          }). Check it was copied exactly and has not been revoked under Settings > Developer > ` +
          "Access Tokens.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `Salesmsg refused the profile read (403${body?.message ? `: ${body.message}` : ""})` +
          " — the token needs the users:read scope.",
      };
    }
    return { ok: false, message: `Salesmsg returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default accessToken;
