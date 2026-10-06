import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API access token — Fireberry authenticates with a user's token sent in a
 * `tokenid` header (not `Authorization`). The token acts as that user: every
 * call sees only what the user's role permits.
 */
const token: AuthDefinition = {
  key: "token",
  type: "apiKey",
  displayName: "API Access Token",
  description:
    "Fireberry → profile picture → Profile → Account Security → API Access Token. Sent as a `tokenid` header. Calls run with the permissions of the user who owns the token.",
  apiKey: { in: "header", name: "tokenid" },
  fields: [
    {
      key: "token",
      label: "API Access Token (TokenID)",
      type: "secret",
      required: true,
      placeholder: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
      hint: "Profile → Account Security → API Access Token tab.",
    },
  ],

  sign({ request, credential }) {
    const { token: tokenId } = credential as { token: string };
    request.headers["tokenid"] = tokenId;
    return request;
  },

  /**
   * Probe: `GET /metadata/records` (the object list). It needs no object-level
   * permission and its body is object metadata, never the token. The verdict is
   * read from the BODY: a good token yields `{success:true, data:[…]}`; any 401
   * is a rejected token (a legacy 401 has an empty body, a v3 one a JSON
   * `{error:"Unauthorized"}`). A 403 means the token was recognised but the
   * user lacks a permission, which is a working credential. 5xx/429 and
   * non-JSON bodies are reported as such, never as a bad token.
   */
  async test({ credential }, ctx) {
    const { token: tokenId } = credential as { token?: string };
    if (!tokenId) return { ok: false, message: "credential missing token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/metadata/records`, {
        headers: { tokenid: tokenId, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Fireberry API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { success?: boolean; data?: unknown; Message?: string; message?: string } | null =
      null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Fireberry */ }

    if (res.ok) {
      return body?.success === true && Array.isArray(body.data) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /metadata/records — not an object list`,
      };
    }
    if (res.status === 403) return { ok: true };
    if (res.status === 401) {
      return { ok: false, message: "Fireberry rejected the API access token (401)" };
    }
    if (res.status === 429) {
      return { ok: false, message: "Fireberry rate limit reached (429); try again shortly" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Fireberry is erroring (${res.status})` };
    }
    return {
      ok: false,
      message: body?.Message ?? body?.message ?? `Fireberry returned ${res.status}`,
    };
  },
};

export default token;
