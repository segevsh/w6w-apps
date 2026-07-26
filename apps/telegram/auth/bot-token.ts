import type { AuthDefinition } from "@w6w/types";
import { API_HOST, TOKEN_PLACEHOLDER } from "../lib/client.ts";

/**
 * Bot Token (`bearer`-shaped, but the token travels in the URL path).
 *
 * The Bot API has no Authorization header: every call is
 * `https://api.telegram.org/bot<token>/<method>`. Since an Action may never
 * hold a credential, the client emits `…/bot{token}/<method>` and this hook —
 * the only code given the credential, running network-less — substitutes the
 * real token. `sign` is allowed to rewrite any part of the request, the URL
 * included, which is exactly what this case needs.
 *
 * n8n also exposes a `baseUrl` field so self-hosted Bot API servers can be
 * targeted. We keep the field, and the runtime's egress allowlist still applies
 * to whatever host it names — so pointing it elsewhere needs a manifest that
 * declares that host.
 */
const botToken: AuthDefinition = {
  key: "bot-token",
  type: "bearer",
  displayName: "Bot Token",
  description:
    "Paste the token BotFather gave you when you created the bot (looks like `123456:ABC-DEF…`).",
  connectionLabel: "@{{bot.username}}",
  fields: [
    {
      key: "accessToken",
      label: "Bot Token",
      type: "secret",
      required: true,
      hint: "Message @BotFather on Telegram → /newbot (or /token for an existing bot).",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    // Fill the token slot the client left in the path. `replace` (not
    // `replaceAll`) — the placeholder appears exactly once, in the path prefix.
    request.url = request.url.replace(TOKEN_PLACEHOLDER, `bot${accessToken}`);
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_HOST}/bot${accessToken}/getMe`);
    const body = await res.json().catch(() => ({})) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, message: body.description ?? `Telegram returned ${res.status}` };
    }
    return { ok: true };
  },

  /** `getMe` identifies the bot behind the token — the natural connection label. */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_HOST}/${TOKEN_PLACEHOLDER}/getMe`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      ok?: boolean;
      result?: { id?: number; username?: string; first_name?: string };
    };
    if (!body.ok || !body.result) return {};
    return {
      bot: {
        id: body.result.id,
        username: body.result.username,
        name: body.result.first_name,
      },
    };
  },
};

export default botToken;
