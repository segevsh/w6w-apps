import type { AuthDefinition } from "@w6w/types";
import { API_URL, graphError } from "../lib/client.ts";

/**
 * Page Access Token (`bearer`) — the only credential the Messenger Platform accepts.
 *
 * Every Send API, Conversations API and Messenger Profile call is Page-scoped: the docs
 * require "a Page access token requested from the Page sending the message". A User token
 * from an OAuth flow cannot stand in for it, and `sign` — the only hook handed a credential,
 * running in a network-less worker — cannot exchange one for the other, so there is no
 * `oauth2` method here (unlike `facebook`, whose reads accept a User token).
 *
 * Get the token from the Meta app dashboard (Messenger → API setup → generate token for the
 * Page), or `GET /me/accounts` with a user token holding `pages_show_list`. The token needs
 * `pages_messaging`; reading conversations also needs `pages_manage_metadata` and
 * `pages_read_engagement`. Prefer a long-lived token.
 */
const pageToken: AuthDefinition = {
  key: "page-token",
  type: "bearer",
  displayName: "Page Access Token",
  description:
    "Paste a Page access token with the pages_messaging permission. Messenger endpoints reject User tokens.",
  connectionLabel: "{{page.name}}",
  fields: [
    {
      key: "accessToken",
      label: "Page Access Token",
      type: "secret",
      required: true,
      hint:
        "Meta app dashboard → Messenger → API setup → generate a token for your Page (pages_messaging, plus pages_manage_metadata and pages_read_engagement to read conversations). Use a long-lived token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /me?fields=id,name` — with a Page token `/me` is the Page itself. The verdict is
   * read from the body (Graph's own `error.code`), not the status: code 190 is a dead token,
   * anything else with an error envelope is reported as Meta worded it. The body carries the
   * Page's id and name, never the credential.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => undefined) as { id?: string } | undefined;
    const err = graphError(body);
    if (err) {
      return {
        ok: false,
        message: err.code === 190
          ? `Facebook rejected the token (code 190): ${err.message ?? "invalid or expired"}`
          : `Facebook error ${err.code ?? res.status}: ${err.message ?? "unknown error"}`,
      };
    }
    if (!body?.id) {
      return { ok: false, message: `Facebook returned no Page id (HTTP ${res.status})` };
    }
    return { ok: true };
  },

  /** The label on the Connection: the Page's name. */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const page = await res.json() as { id?: string; name?: string };
    return { page: { id: page.id, name: page.name } };
  },
};

export default pageToken;
