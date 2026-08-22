import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * Mux access token — an ID and a secret key, sent as HTTP Basic.
 *
 * ## The token's permissions are chosen when it is created
 *
 * Mux issues access tokens scoped to particular products — Mux Video, Mux Data,
 * System — and read-only or full. A token created for Video alone authenticates
 * perfectly and then fails every `/data/v1/*` call, which is why `test` proves
 * *identity* rather than capability and the README lists which actions need
 * which product.
 *
 * ## The secret key is shown once
 *
 * Mux displays it at creation and never again. That is worth saying in the hint,
 * because the recovery is to create a new token rather than to look the old one
 * up.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Access Token",
  description:
    "A Mux access token ID and secret key. The products it was created for decide what it can " +
    "reach — a Video-only token cannot read Data.",
  connectionLabel: "Mux ({{environment}})",
  fields: [
    {
      key: "tokenId",
      label: "Access Token ID",
      type: "secret",
      required: true,
      row: "token",
      hint: "Mux Dashboard → Settings → Access Tokens.",
    },
    {
      key: "tokenSecret",
      label: "Secret Key",
      type: "secret",
      required: true,
      row: "token",
      hint: "Shown once, when the token is created. If it is lost, the fix is a new token.",
    },
  ],

  sign({ request, credential }) {
    const { tokenId, tokenSecret } = credential as { tokenId: string; tokenSecret: string };
    request.headers["authorization"] = `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;
    return request;
  },

  /**
   * `GET /video/v1/assets?limit=1` — the cheapest call that proves the token
   * works. A `401` here is a credential problem; a `403` means the token was
   * created without the Mux Video product, which is a different fix.
   */
  async test({ credential }, ctx) {
    const { tokenId, tokenSecret } = credential as { tokenId?: string; tokenSecret?: string };
    if (!tokenId || !tokenSecret) {
      return { ok: false, message: "credential missing the token id or secret" };
    }

    const res = await ctx.fetch(`${BASE_URL}/video/v1/assets?limit=1`, {
      headers: {
        authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
        accept: "application/json",
      },
    });
    if (res.status === 401) {
      await res.body?.cancel();
      return { ok: false, message: "Mux rejected the token id or secret key" };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "the token is valid but was not created with the Mux Video product — Mux scopes " +
          "tokens per product",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Mux returned ${res.status}` };
    }
    await res.body?.cancel();
    return { ok: true };
  },

  /**
   * Mux has no environments and no whoami endpoint, so there is nothing to
   * discover — the label is static and the credential is never exposed.
   */
  afterConnect() {
    return { environment: "production" };
  },
};

export default basic;
