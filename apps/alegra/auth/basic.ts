import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText, V1 } from "../lib/client.ts";

/**
 * Account email + API token (`basic`).
 *
 * Alegra's "Autenticación" page: "El acceso al API se realiza utilizando el correo y el token
 * otorgado al usuario registrado en Alegra", sent as `Authorization: Basic base64(email:token)`.
 * The token is generated in Alegra under Configuración > "API - Integraciones con otros sistemas",
 * which also shows the email to pair it with.
 *
 * The credential reaches the wire only as a header, built in {@link basicHeader}.
 */
export interface AlegraCredential {
  email: string;
  token: string;
}

export function basicHeader(credential: Partial<AlegraCredential>): string {
  return `Basic ${btoa(`${credential.email ?? ""}:${credential.token ?? ""}`)}`;
}

/**
 * The credential-liveness probe: `GET /company`.
 *
 * It returns the company profile (name, tax id, regime, address) — never the token — and
 * needs no id the caller might not have. `/users/self` is the other candidate, but it returns
 * the user's own record, which is more personal than a connection check needs.
 *
 * **Classification is by body, not by status.** Alegra sits behind an AWS API gateway that
 * answers EVERY request without an accepted credential — a missing header, a wrong token, even
 * an unknown path — with the identical `401 {"message":"Unauthorized"}` (measured live
 * 2026-10-06). So a 401 here is a rejected credential, and a pass needs the documented company
 * shape (`name` / `applicationVersion`), not merely a 2xx. A 403 carries the application's own
 * `{error, code}` envelope: the credential was recognised but this user may not read company
 * settings, which is a working connection, not a broken one.
 */
export const PROBE_PATH = "/company";

export function classifyProbe(status: number, body: unknown): string {
  const vendor = errorText(body);
  if (status === 401) {
    return "Alegra rejected the email / API token pair (401 Unauthorized). A missing and a wrong " +
      "token are indistinguishable. Re-copy both from Configuración > API - Integraciones con " +
      "otros sistemas in Alegra, and check the token belongs to that exact email.";
  }
  if (status === 402) {
    return `Alegra returned 402${vendor ? `: ${vendor}` : ""} — the account is suspended or its ` +
      "plan does not include API access.";
  }
  if (status === 404) {
    return "Alegra returned 404, which it also uses for a suspended account" +
      `${vendor ? `: ${vendor}` : ""}.`;
  }
  if (status === 429) {
    return "Alegra rate-limited the check (429; 150 requests/minute per user). That says nothing " +
      "about the credential.";
  }
  if (status >= 500) {
    return `Alegra returned ${status} for ${PROBE_PATH}${vendor ? `: ${vendor}` : ""}. A ` +
      "server-side failure, not a verdict on the credential.";
  }
  return `Alegra returned ${status} for ${PROBE_PATH}${vendor ? `: ${vendor}` : ""}.`;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Email & API Token",
  description:
    "The account email and the API token from Configuración > API - Integraciones con otros " +
    "sistemas in Alegra. Sent as the HTTP Basic username and password.",
  fields: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      row: "creds",
      hint: "The email shown beside the token in Alegra's API settings (the Basic username).",
    },
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The token from Alegra's API settings (the Basic password). Generate one there if " +
        "none exists.",
    },
  ],

  /** The only hook handed the raw credential; network-less. Stamps the Basic header. */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<AlegraCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AlegraCredential>;
    const email = (cred?.email ?? "").trim();
    const token = (cred?.token ?? "").trim();
    if (!email || !token) return { ok: false, message: "credential missing email or token" };

    const res = await ctx.fetch(`${API_BASE}${V1}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: basicHeader({ email, token }) },
    });
    const body = await res.json().catch(() => null) as unknown;
    if (res.ok) {
      const company = body as { name?: unknown; applicationVersion?: unknown } | null;
      if (
        company && typeof company === "object" && !Array.isArray(company) &&
        (typeof company.name === "string" || typeof company.applicationVersion === "string")
      ) {
        return { ok: true };
      }
      return {
        ok: false,
        message: `Alegra answered ${res.status} for ${PROBE_PATH} but not with a company document`,
      };
    }
    // 403 is the application's own refusal: the credential was accepted, the user lacks a permission.
    if (res.status === 403 && errorText(body) !== undefined) return { ok: true };
    return { ok: false, message: classifyProbe(res.status, body) };
  },
};

export default basic;
