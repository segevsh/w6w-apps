/**
 * Otter.ai API key — a plain bearer token.
 *
 * `Authorization: Bearer <key>` (docs section "Authentication"). Minted at
 * Otter.ai > Integrations > Developer tab > Create key, capped at 2 per user,
 * shown only once. The Public API surface it unlocks is Enterprise-only —
 * see `lib/client.ts` for the docs' own wording.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

interface OtterCredential {
  apiKey: string;
}

interface OtterErrorBody {
  error?: string;
}

interface WorkspaceBody {
  data?: { name?: string };
}

/**
 * The probe used by both `test` and `afterConnect`.
 *
 * `GET /workspace` was chosen by reading the response body, not the name: it
 * needs no admin privilege and returns only workspace metadata (id, name,
 * owner, member_count, handle, type) — no field on it can echo the caller's
 * own API key back, the failure mode that rules a probe out entirely.
 */
const PROBE_PATH = "/workspace";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Otter.ai > Integrations > Developer tab. Requires an Enterprise " +
    "workspace — the Public API is not available on Free, Pro or Business plans.",
  connectionLabel: "{{workspace.name}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Otter.ai > Integrations > Developer tab > Create key. Shown once — copy it " +
        "immediately, and store it somewhere safe. Up to 2 keys per user.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns, so the credential-holder cannot reach the
   * network and the network-caller never sees the credential.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<OtterCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<OtterCredential>;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as OtterErrorBody | null;
    if (res.status === 401) {
      return {
        ok: false,
        message: `Otter rejected the API key (401${body?.error ? ` ${body.error}` : ""}). ` +
          "Check it was copied exactly and has not been deleted in Otter.ai > Integrations > " +
          "Developer tab.",
      };
    }
    if (res.status === 404) {
      // The docs' own documented failure mode of THIS endpoint: "User not in
      // a workspace". Distinct from a bad key — the credential authenticated,
      // there is just nothing this app can read yet (or the account is not
      // on an Enterprise plan with Public API access).
      return {
        ok: false,
        message: "Otter accepted the API key but its owner is not in a workspace — the Public " +
          "API requires an Enterprise workspace.",
      };
    }
    return { ok: false, message: `Otter returned HTTP ${res.status} for GET /v1/workspace` };
  },

  async afterConnect(_input, ctx) {
    // Unsigned here in the same sense as every other hook: the runtime routes
    // this through `sign`, which supplies the credential.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as WorkspaceBody | null;
    if (!body?.data?.name) return {};
    return { workspace: { name: body.data.name } };
  },
};

export default apiKey;
