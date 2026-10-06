import type { AuthDefinition } from "@w6w/types";
import { API_URLS, errorText, type PylonErrorBody, type Region } from "../lib/client.ts";

interface StoredCredential {
  apiKey: string;
  region?: string;
}

const regionOf = (c: Partial<StoredCredential>): Region => c.region === "eu" ? "eu" : "us";

/**
 * API token — Pylon uses `Authorization: Bearer <token>`. Only Admin users can create tokens
 * (app.usepylon.com/settings/api-tokens), and actions performed by the token show up under the
 * token's name.
 *
 * `region` is collected next to the token because Pylon runs two hosts (`api.usepylon.com` and
 * `api.eu.usepylon.com`) and offers no way to discover the tenant's region from a token. A token
 * used on the other region's host is refused with the stable code `wrong_region_token`.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Create a token as an Admin at app.usepylon.com/settings/api-tokens. Sent as `Authorization: Bearer <token>`.",
  connectionLabel: "{{organization}} ({{region}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "US (api.usepylon.com)" },
        { value: "eu", label: "EU (api.eu.usepylon.com)" },
      ],
      hint: "Where your Pylon tenant is hosted. A token only works against its own region's API.",
    },
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "app.usepylon.com/settings/api-tokens (Admins only).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as StoredCredential;
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * Probe: `GET /me`. It returns the organization (`id`, `name`) and the token's user (`id`,
   * `email`) — never the token. The verdict is read from the BODY: a 2xx must carry
   * `data.id`, and a rejection is told apart by Pylon's stable error `code`, never by the status
   * or the (localised, rewordable) message. A `permission_denied` still proves the token was
   * recognised, so it passes.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    if (!cred.apiKey) return { ok: false, message: "credential missing apiKey" };
    const region = regionOf(cred);

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URLS[region]}/me`, {
        headers: { authorization: `Bearer ${cred.apiKey}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Pylon ${region.toUpperCase()} API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Pylon */ }
    const err = body as PylonErrorBody | null;

    if (res.ok) {
      const id = (body as { data?: { id?: unknown } } | null)?.data?.id;
      return typeof id === "string" && id !== "" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /me — no organization in it`,
      };
    }
    if (err?.code === "permission_denied") return { ok: true };
    if (err?.code === "wrong_region_token") {
      return {
        ok: false,
        message:
          `this token belongs to the other region — switch Region from ${region.toUpperCase()}`,
      };
    }
    if (!err?.code && !Array.isArray(err?.errors)) {
      return {
        ok: false,
        message:
          `Pylon returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Pylon is erroring (${res.status}): ${errorText(err)}` };
    }
    return { ok: false, message: errorText(err) || `Pylon returned ${res.status}` };
  },

  /** Records the region (the only place a non-secret field survives) and the organization name. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    const region = regionOf(cred);
    let organization = "Pylon";
    try {
      const res = await ctx.fetch(`${API_URLS[region]}/me`, {
        headers: { authorization: `Bearer ${cred.apiKey ?? ""}`, accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json() as { data?: { name?: string } };
        if (body.data?.name) organization = body.data.name;
      }
    } catch { /* the label falls back to "Pylon" */ }
    return { region, organization };
  },
};

export default apiToken;
