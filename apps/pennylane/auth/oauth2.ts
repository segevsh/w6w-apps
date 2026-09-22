import type { AuthDefinition } from "@w6w/types";
import { API_URL, parsePennylaneError } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — Pennylane's "integration partner" path, the same shape
 * `apps/asana/auth/oauth2.ts` uses.
 *
 * Everything below comes from `pennylane.readme.io/docs/oauth-20-walkthrough.md`
 * (read 2026-09-22):
 *
 *   - **Authorize** — `GET https://app.pennylane.com/oauth/authorize` with
 *     `client_id`, `redirect_uri`, `response_type=code`, a space-separated
 *     `scope`, and an optional `state`.
 *   - **Token** — `POST https://app.pennylane.com/oauth/token`, form-encoded in
 *     the body: `grant_type=authorization_code` plus `client_id`,
 *     `client_secret`, `code` and `redirect_uri`.
 *   - **Refresh** — the same endpoint with `grant_type=refresh_token` plus
 *     `client_id` and `client_secret`. **Pennylane rotates refresh tokens**: the
 *     response carries a brand-new `refresh_token` and the old one — along with
 *     the old access token — stops working immediately, so the runtime must
 *     persist the replacement rather than the one it sent. Access tokens last
 *     `expires_in` seconds (documented 86400, 24 hours); refresh tokens last 90
 *     days.
 *   - **Revoke** — `POST /oauth/revoke` with `client_id`, `client_secret` and
 *     `token`. Not modelled here (no action in this app's set needs it); see the
 *     README.
 *
 * `pkce: false` because Pennylane's walkthrough never mentions PKCE — the flow
 * it documents is the plain authorization-code grant, exactly as Asana's is.
 *
 * The `credentials` a connection stores are `client_id`, `client_secret` and
 * `redirect_uri` from the app registration (configured host-side) plus the
 * `accessToken`/`refreshToken` the exchange returns.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Pennylane)",
  description: "Pennylane's OAuth 2.0 authorization-code flow. Requires a Pennylane OAuth app " +
    "registration (client_id / client_secret / redirect_uri) configured on this w6w " +
    "installation.",
  connectionLabel: "{{user.name}} ({{company.name}})",
  oauth2: {
    authorizationUrl: "https://app.pennylane.com/oauth/authorize",
    tokenUrl: "https://app.pennylane.com/oauth/token",
    pkce: false,
    /**
     * The union of the scopes the 22 actions require.
     *
     * Pennylane issues per-resource scopes in a `:readonly` / `:all` pair, and
     * `:all` is read **and** write (`docs/v2-scopes.md`: ":all — Full access
     * (read + write + delete)"), so each pair collapses to its `:all` member.
     * Nine resources are touched: customers (a company customer write and an
     * individual-customer write both live under `customers:all`), suppliers,
     * products, both invoice directions, journals, ledger accounts, analytic
     * categories and bank transactions. `GET /me` needs no scope at all, which
     * is what makes it usable as the credential probe.
     */
    scopes: [
      "customers:all",
      "suppliers:all",
      "products:all",
      "customer_invoices:all",
      "supplier_invoices:all",
      "journals:all",
      "ledger_accounts:all",
      "categories:all",
      "transactions:all",
    ],
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Is this credential live? `GET /me` — the one endpoint that answers the
   * question without echoing any credential material back: it returns the user,
   * the company and the granted scopes, never the token.
   *
   * A rejected token is classified from the response **body** where the vendor
   * gave one (`{ "error", "message" }` — `docs/error-handling-status-codes.md`);
   * a bare 401 with no body is reported by status, which is all the vendor
   * offers in that case.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const body = parsePennylaneError(raw);
    const detail = body?.message ?? body?.error;
    return {
      ok: false,
      message: detail
        ? `Pennylane rejected the token (${res.status}): ${detail}`
        : `Pennylane returned ${res.status}`,
    };
  },

  /**
   * Populate the connection label. The same `GET /me` call as `test`, here for
   * its body: the user and the company the token is scoped to.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      user?: {
        id?: number;
        first_name?: string;
        last_name?: string;
        email?: string;
        locale?: string;
      };
      company?: { id?: number; name?: string; reg_no?: string };
    } | null;
    if (!body) return {};

    const user = body.user ?? {};
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return {
      user: {
        id: user.id,
        name,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        locale: user.locale,
      },
      company: {
        id: body.company?.id,
        name: body.company?.name,
        regNo: body.company?.reg_no,
      },
    };
  },
};

export default oauth2;
