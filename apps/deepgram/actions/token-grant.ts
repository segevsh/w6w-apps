import type { ActionDefinition } from "@w6w/types";
import { compact, DeepgramClient } from "../lib/client.ts";

/**
 * `POST /v1/auth/grant` — mint a short-lived token so the API key never leaves
 * the server.
 *
 * ## What this is for
 *
 * Deepgram's streaming API runs over a WebSocket, which means the client — a
 * browser, a mobile app, a phone bridge — connects to Deepgram directly. The
 * naïve way to make that work is to ship the API key to the client, and then it
 * is in a bundle, a network tab, and eventually somebody else's hands.
 *
 * A grant produces a JWT that expires in **30 seconds by default**, authorises
 * the same project, and is sent as `Authorization: Bearer` rather than
 * `Token`. The client asks your backend, your backend asks this, and the key
 * stays where it belongs.
 *
 * ## The lifetime is a security parameter
 *
 * It is short on purpose: a token that leaks is only useful for as long as it
 * lives. Long enough to open a connection is the right answer, not long enough
 * to be convenient — and a connection already open is not cut off when its
 * token expires.
 *
 * **The token is returned and never logged**, because for its lifetime it is
 * exactly as powerful as the key that minted it.
 */
const action: ActionDefinition = {
  key: "token-grant",
  type: "perform",
  resource: "token",
  title: "Grant a temporary token",
  description:
    "Mint a short-lived JWT so a browser or device can reach Deepgram's streaming API without " +
    "ever holding the API key. Sent as Bearer, not Token.",
  idempotent: false,
  params: [
    {
      key: "ttlSeconds",
      label: "Lifetime (seconds)",
      type: "number",
      default: 30,
      hint: "Deepgram's default is 30. Long enough to open a connection, not long enough to be " +
        "worth stealing — an open connection is not cut off when it expires.",
    },
  ],
  output: [
    { key: "access_token", type: "string", label: "The token — send it as `Bearer`" },
    { key: "expires_in", type: "number", label: "Seconds until it stops working" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ttl = p.ttlSeconds === undefined ? 30 : Number(p.ttlSeconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error("`ttlSeconds` must be a positive number");
    }

    const granted = await new DeepgramClient(ctx).request<{ expires_in?: number }>(
      "/v1/auth/grant",
      { method: "POST", body: compact({ ttl_seconds: ttl }) },
    );

    // The lifetime, never the token: for its lifetime it is as powerful as the key.
    ctx.log("info", "granted a temporary Deepgram token", {
      expiresIn: granted?.expires_in ?? ttl,
    });
    return granted;
  },
};

export default action;
