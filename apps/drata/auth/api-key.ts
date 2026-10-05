import type { AuthDefinition } from "@w6w/types";
import { baseForRegion, formatDrataError, parseRegion, REGION_OPTIONS } from "../lib/client.ts";

/**
 * Drata API key — `Authorization: Bearer <key>`.
 *
 * Verified 2026-10-05 against the OpenAPI document's `components.securitySchemes`:
 * a single scheme `bearer` (`type: http`, `scheme: bearer`, `bearerFormat: API_KEY`).
 * Keys are created in the Drata web app (Settings > API Keys) and carry
 * **per-key permissions** — each endpoint's `x-drata-permissions` names the one it
 * needs (`workspaces-get`, `vendors-get`, ...), so a key scoped for read-only
 * reporting legitimately answers 403 on a write. That is why `test` below treats
 * a 403 as "the key is real" rather than "the key is broken".
 *
 * ## Region is a connect-time field
 *
 * A key only authenticates on its own region's host, and the wrong host answers
 * 401 — which reads as a bad key. The region is therefore asked for up front, from
 * a fixed list, and published on the Connection by `afterConnect` so Actions
 * (which never see the credential) can pick the host.
 */

export interface DrataCredential {
  apiKey: string;
  region?: string;
}

/** The probe: `GET /workspaces?size=1`. See {@link test} for why. */
export const PROBE_PATH = "/workspaces";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "An API key from Drata (Settings > API Keys), plus the region your Drata account lives in. " +
    "Give the key only the permissions the workflows using this connection need.",
  connectionLabel: "Drata ({{region}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Created in Drata under Settings > API Keys. The user who owns the key must have " +
        "accepted Drata's terms in the web app, or every call answers 412.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "us",
      options: REGION_OPTIONS,
      hint: "Which Drata host your account is on. The wrong region answers 401, which looks like " +
        "a bad key.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<DrataCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  /**
   * `GET /workspaces?size=1` — a read that needs only `workspaces-get`, returns
   * workspace names (no credential material) and exists on every account. It is
   * classified from the response, not from the status alone:
   *
   *   - 2xx: valid.
   *   - 401: rejected (wrong key, or the right key on the wrong region host).
   *   - 403 with Drata's `{statusCode, message, code}` body: the key
   *     authenticated and merely lacks `workspaces-get` — a scoped key is a
   *     supported configuration, so this is `ok`, with the reason stated.
   *   - 412: the key's owner has not accepted Drata's terms; every call will fail.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<DrataCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    const region = cred.region === undefined || cred.region === ""
      ? "us"
      : parseRegion(cred.region);
    if (!region) return { ok: false, message: `unknown region "${cred.region}"` };

    const res = await ctx.fetch(`${baseForRegion(region)}${PROBE_PATH}?size=1`, {
      headers: { accept: "application/json", authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    let body: { statusCode?: number; message?: string | string[]; code?: number } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const message = formatDrataError(res.status, body, text);
    const drataShaped = typeof body?.statusCode === "number" && body.message !== undefined;

    if (res.status === 403 && drataShaped) {
      return {
        ok: true,
        message: "API key accepted, but it lacks the Workspaces: List permission " +
          "(scoped keys are fine; some actions may be refused).",
      };
    }
    return { ok: false, message };
  },

  /** Publish the region (not a secret) so Actions can choose the host. Never the key. */
  afterConnect({ credential }) {
    const region = parseRegion((credential as Partial<DrataCredential>)?.region) ?? "us";
    return { region };
  },
};

export default apiKey;
