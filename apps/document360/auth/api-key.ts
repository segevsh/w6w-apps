import type { AuthDefinition } from "@w6w/types";
import {
  apiBase,
  baseHeaders,
  DEFAULT_REGION,
  describeProblem,
  errorCodes,
  isRegion,
  type Pagination,
  type Problem,
  type Region,
  REGION_OPTIONS,
} from "../lib/client.ts";

/**
 * Document360 v3 API key — `X-API-Key: d360_sk_…`.
 *
 * Verified 2026-10-06 against `apidocs.document360.com/apidocs/generating-an-api-key` and the
 * v3 OpenAPI document. The key is created in the portal under Settings > Knowledge base portal >
 * API keys, shown once, and carries a portal role, a content role and a content-access scope: it
 * can do exactly what a team member with those roles could. `Authorization: Bearer` is reserved
 * for OAuth 2.0 access tokens and is NOT used here. The older v1/v2 `api_token` header is a
 * different credential and does not work against v3.
 */

export interface Document360Credential {
  apiKey: string;
  region?: Region;
  projectId?: string;
}

/**
 * The one place the wire format is built, shared by `sign`, `test` and `afterConnect` so a probe
 * never sends a header the real requests do not.
 */
export function authHeaders(credential: Partial<Document360Credential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/** `GET /v3/projects` — the docs' own "first request". See {@link probe}. */
export const PROBE_PATH = "/v3/projects";

function regionOf(cred: Partial<Document360Credential>): Region {
  return isRegion(cred.region) ? cred.region : DEFAULT_REGION;
}

/**
 * ## The probe: `GET /v3/projects?page_size=1`
 *
 * It requires a key (unsigned it answers `401`), returns project names and ids only — never the
 * key — and is the request Document360's own getting-started guide uses. It needs the
 * `ViewProjectSettings` permission, which a narrowly scoped key may lack, so the verdict is
 * taken from the **body's error code**, not the status:
 *
 *  - `200` with `success: true` and a `data` array — live.
 *  - `401` — rejected. The gateway answers with an EMPTY body (no problem+json), and a missing
 *    key and a wrong key are indistinguishable; the status is the only signal here.
 *  - `403 FORBIDDEN` — the key authenticated but this probe's permission is not granted. The
 *    credential is live, so it passes, with a note.
 *  - `403 FEATURE_NOT_IN_LICENSE` / `PREMIUM_FEATURE_NOT_IN_LICENSE` / `LICENSE_LIMIT_EXCEEDED` —
 *    plan or entitlement, not a bad key, and retrying will not help. Every endpoint will fail, so
 *    this is reported as not usable, with the plan message.
 */
export async function probe(
  fetchFn: typeof fetch,
  credential: Partial<Document360Credential>,
  pageSize = 1,
): Promise<{ res: Response; problem: Problem | null; body: unknown }> {
  const url = `${apiBase(regionOf(credential))}${PROBE_PATH}?page_size=${pageSize}`;
  const res = await fetchFn(url, { headers: { ...baseHeaders(), ...authHeaders(credential) } });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { res, problem: res.ok ? null : (body as Problem | null), body };
}

const PLAN_CODES = ["FEATURE_NOT_IN_LICENSE", "PREMIUM_FEATURE_NOT_IN_LICENSE"];

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key (v3)",
  description:
    "A v3 API key from Document360 > Settings > Knowledge base portal > API keys. Sent as the " +
    "`X-API-Key` header. API access needs a Business, Enterprise or Trial plan.",
  connectionLabel: "Document360 ({{projectName}})",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Starts with d360_sk_. Create it under Settings > Knowledge base portal > API keys " +
        'and choose "Enhanced keys (v3)". It is shown only once. The older api_token of the v1/v2 ' +
        "API does not work.",
    },
    {
      key: "region",
      label: "Data center",
      type: "select",
      required: true,
      default: DEFAULT_REGION,
      options: REGION_OPTIONS,
      hint: "Where your project is hosted. A key only works against its own data center.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      hint: "Optional default project. Leave empty and, if the key can see exactly one project, " +
        "it is filled in for you.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<Document360Credential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link probe} for why this endpoint and how the verdict is classified. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<Document360Credential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    const region = regionOf(cred);

    const { res, problem, body } = await probe(ctx.fetch, { ...cred, apiKey: key });
    if (res.ok) {
      const b = body as { success?: boolean; data?: unknown } | null;
      if (b?.success === true && Array.isArray(b.data)) return { ok: true };
      return {
        ok: false,
        message: `Document360 (${region}) answered ${res.status} without the documented projects ` +
          "envelope. Check the data center.",
      };
    }
    const codes = errorCodes(problem);
    if (res.status === 401) {
      return {
        ok: false,
        message: `Document360 rejected the API key on the ${region} data center (401). Check ` +
          "it is a v3 key (d360_sk_…), copied exactly, not expired or deleted, and that the " +
          "data center matches where the project is hosted.",
      };
    }
    if (res.status === 403) {
      if (codes.some((c) => PLAN_CODES.includes(c)) || codes.includes("LICENSE_LIMIT_EXCEEDED")) {
        return {
          ok: false,
          message: `Document360 refused the request for plan reasons: ${
            describeProblem(res, problem)
          }`,
        };
      }
      return {
        ok: true,
        message: "The key is valid but cannot list projects (no ViewProjectSettings " +
          "permission). Set the project id on the Connection.",
      };
    }
    return { ok: false, message: describeProblem(res, problem) };
  },

  /**
   * Publish the region, the project the connection addresses, and its name — nothing else. A
   * failure is silent: `test` already proved the key.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<Document360Credential>;
    const region = regionOf(cred);
    const wanted = (cred.projectId ?? "").trim();
    const out: Record<string, string> = { region, projectName: "Document360" };
    if (wanted) out.projectId = wanted;
    try {
      const { res, body } = await probe(ctx.fetch, cred, 100);
      if (!res.ok) return out;
      const b = body as {
        data?: Array<{ id?: string; name?: string }>;
        pagination?: Pagination;
      } | null;
      const projects = Array.isArray(b?.data) ? b.data : [];
      const match = wanted
        ? projects.find((p) => p.id === wanted)
        : projects.length === 1 && !b?.pagination?.has_more
        ? projects[0]
        : undefined;
      if (match?.id) out.projectId = match.id;
      if (match?.name) out.projectName = match.name;
    } catch {
      // keep what we have
    }
    return out;
  },
};

export default apiKey;
