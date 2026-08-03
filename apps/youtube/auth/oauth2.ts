import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `youtube.googleapis.com`, and allowing the generic Google API front door would
 * widen the sandbox to every Google service for no reason. Composing the URN
 * from a named constant keeps that distinction explicit in the source rather
 * than leaving a bare URL literal that reads like an endpoint.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the only way to reach a *user's own* YouTube data.
 *
 * You register an app in the Google Cloud Console, enable the YouTube Data API
 * v3, store the resulting `client_id` + `client_secret` + `redirect_uri` on the
 * w6w server, and end users then connect via the browser authorization dance.
 * Google requires `access_type=offline` + `prompt=consent` to reliably hand back
 * a refresh token on every consent.
 *
 * **Scope choice — one scope, and why it is that one.** Google documents seven
 * YouTube scopes. Five are out of scope for this app: `youtube.upload` (video
 * upload, which this app does not implement — see the README), the two
 * `youtubepartner*` scopes (YouTube Content ID partners only), and
 * `youtube.channel-memberships.creator` (the members endpoints, not implemented).
 * That leaves `youtube`, `youtube.readonly` and `youtube.force-ssl`.
 *
 * `youtube.force-ssl` is requested alone because it is the only one that covers
 * the entire action set. Checked against the discovery document's per-method
 * `scopes` arrays: every method this app calls accepts `youtube.force-ssl`,
 * whereas `commentThreads.list` and `comments.insert` accept **force-ssl and
 * nothing else** — so `youtube` alone cannot serve the comment actions. Adding
 * `youtube` or `youtube.readonly` alongside it would grant nothing extra and
 * only make the consent screen longer.
 *
 * A read-only credential is still a supported posture: it just cannot be minted
 * here. If you want public-data reads without account access, connect the
 * `api-key` method instead.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the YouTube Data API v3 enabled and OAuth client credentials configured on this w6w installation. Grants access to the signed-in user's own channel.",
  connectionLabel: "{{channel.title}}",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      scope("youtube.force-ssl"),
    ],
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // `channels.list?mine=true` is the canonical YouTube whoami and the cheapest
    // call the API offers (1 quota unit). `part=id` asks for the smallest
    // possible response. Every YouTube scope — readonly, youtube, force-ssl —
    // can reach it, so this never reports a working, narrowly-scoped credential
    // as broken. An account with no channel still returns 200 with an empty
    // `items`, which is a live credential and is reported as such.
    const res = await ctx.fetch(`${API_URL}/channels?part=id&mine=true`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `YouTube returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    // One extra unit to label the connection with the channel it actually
    // controls — worth it, because a YouTube account and the channel it manages
    // are not the same thing and users routinely hold several.
    const res = await ctx.fetch(`${API_URL}/channels?part=snippet&mine=true`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      items?: Array<{ id?: string; snippet?: { title?: string; customUrl?: string } }>;
    };
    const channel = body.items?.[0];
    if (!channel) return { channel: { title: "YouTube" } };
    return {
      channel: {
        id: channel.id,
        title: channel.snippet?.title ?? "YouTube",
        handle: channel.snippet?.customUrl,
      },
    };
  },
};

export default oauth2;
