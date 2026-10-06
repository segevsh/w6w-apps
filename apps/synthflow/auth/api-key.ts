import type { AuthDefinition } from "@w6w/types";
import { ALL_HOSTS, API_PREFIX, baseUrl, HOSTS, regionOf } from "../lib/client.ts";

/**
 * Synthflow API key — `Authorization: Bearer <key>`.
 *
 * Verified against `components.securitySchemes.sec0` in Synthflow's OpenAPI document
 * (`{"type": "http", "scheme": "bearer"}`) and live probes of all three hosts on 2026-10-05.
 * Keys are created under Admin > Workspace Settings > API Keys.
 *
 * ## Region
 *
 * A workspace lives in one cluster (Global, US or EU) and cannot be moved, and a key is
 * only valid on its own cluster's host, so `region` is collected with the key. `sign`
 * pins the request to that region's host (it is the only hook that always holds the
 * credential), and `afterConnect` echoes the region into the redacted connection so the
 * action client builds its base URL from it.
 *
 * ## Classifying the probe from the body
 *
 * Both rejection cases answer `401` with `{"detail": {"status": "error", "description": ...}}`
 * on every host, and the description tells them apart (measured 2026-10-05):
 *
 *     no header  -> "Missing or invalid Authorization header"
 *     bad key    -> "Unauthorized: Invalid or expired token."
 *
 * `test` decides from that description, not the status code: only a description that
 * says the credential was refused is reported as a rejected key; any other failure is
 * reported as what it is, so an outage or a permission problem is never misread as a
 * bad key.
 */

export interface SynthflowCredential {
  apiKey: string;
  region?: string;
}

/** `GET /assistants/` takes no required parameter — the call Synthflow's own docs use to verify a key. */
export const PROBE_PATH = "/assistants/";

/** Wire format, built in one place for `sign` and `test`. */
export function authHeaders(credential: Partial<SynthflowCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

interface AuthErrorBody {
  detail?: { description?: string } | string;
}

function descriptionOf(body: AuthErrorBody | null): string | undefined {
  const d = body?.detail;
  return typeof d === "string" ? d : d?.description;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Create a key under Admin > Workspace Settings > API Keys and choose the region of your " +
    "workspace (Admin > Workspace Settings > Preferences > Customer Region).",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Admin > Workspace Settings > API Keys > Create new API key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "global",
      options: [
        { value: "global", label: `Global — ${HOSTS.global}` },
        { value: "us", label: `United States — ${HOSTS.us}` },
        { value: "eu", label: `European Union — ${HOSTS.eu}` },
      ],
      hint: "The cluster is fixed when a workspace is created. A key sent to the wrong cluster " +
        "is refused exactly like a wrong key.",
    },
  ],

  /** The only hook handed the raw credential; network-less. Stamps the header, pins the host. */
  sign({ request, credential }) {
    const cred = credential as Partial<SynthflowCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    try {
      const url = new URL(request.url);
      // Only ever move between Synthflow's own three hosts.
      if (ALL_HOSTS.includes(url.hostname)) {
        url.hostname = HOSTS[regionOf(cred.region)];
        request.url = url.toString();
      }
    } catch { /* unparseable URL — leave it, the request fails loudly on its own */ }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<SynthflowCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const region = regionOf(cred.region);
    const res = await ctx.fetch(`${baseUrl(region)}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as AuthErrorBody | null;
    const description = descriptionOf(body);

    if (description && /invalid or expired token|invalid.*(api )?key/i.test(description)) {
      return {
        ok: false,
        message: `Synthflow rejected the key on the ${region} cluster: ${description} ` +
          "Check the key and that the region matches your workspace.",
      };
    }
    if (description && /missing or invalid authorization/i.test(description)) {
      return { ok: false, message: `Synthflow did not receive a usable key: ${description}` };
    }
    return {
      ok: false,
      message: `Synthflow returned HTTP ${res.status} for ${API_PREFIX}${PROBE_PATH}${
        description ? `: ${description}` : ""
      }`,
    };
  },

  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: regionOf(region) };
  },
};

export default apiKey;
