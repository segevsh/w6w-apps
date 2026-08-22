import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, dataHost, MANAGEMENT_HOST } from "../lib/client.ts";

/**
 * Sanity API token, sent as `Authorization: Bearer`.
 *
 * Four fields, because a Sanity request needs more than a credential: the
 * **project** is part of every data hostname, the **dataset** is part of every
 * data path, and the **CDN** choice decides which of two hosts answers.
 *
 * ## Token permissions are a real decision, made outside this app
 *
 * Sanity tokens are issued with a role — Viewer, Editor, Deploy Studio,
 * Administrator — and the API enforces it per document type. A Viewer token
 * connects perfectly and fails every mutation, so `test` proves *identity*
 * rather than capability and says which project the token reaches.
 *
 * ## Reading through the CDN is opt-in, and Sanity says why
 *
 * Sanity's own guidance: *"When building integrations with Sanity or responding
 * to webhooks, we recommend using the API to capture the latest saved
 * content."* A workflow woken by a webhook and reading through the CDN can read
 * the content as it was *before* the change that woke it — and if the Content
 * Lake is down, the CDN keeps serving the last cached content for up to two
 * hours, so the workflow succeeds on stale data without noticing.
 *
 * The default here is therefore the live API. The CDN is offered for the case
 * it is genuinely for: high-volume reads of content that need not be current.
 */
const token: AuthDefinition = {
  key: "token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "A Sanity API token, plus the project and dataset it works on. The token's role decides " +
    "what it can write — a Viewer token connects and then fails every mutation.",
  connectionLabel: "{{projectId}}/{{dataset}}",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "sanity.io/manage → your project → API → Tokens. An Editor token is the usual " +
        "choice; a Viewer token cannot mutate.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      placeholder: "a1b2c3d4",
      hint: "Eight characters. It is part of every data request's HOSTNAME, not its path.",
    },
    {
      key: "dataset",
      label: "Dataset",
      type: "string",
      required: true,
      default: "production",
      hint: "Most projects have `production`, and often `development` beside it. Individual " +
        "actions can override this.",
    },
    {
      key: "useCdn",
      label: "Read Through The CDN",
      type: "boolean",
      default: false,
      hint: "Off by default on Sanity's own advice: an integration should read the live API to " +
        "see the latest saved content. The CDN is faster and cheaper, but can serve content " +
        "from before the change that triggered the workflow — and keeps serving cached content " +
        "for up to two hours if the Content Lake is down.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /projects/{projectId}` on the management API.
   *
   * Chosen over a data query because it needs no dataset and no GROQ: it
   * proves the token is live and that it reaches *this project*, which is the
   * failure a token from another project would otherwise show as an empty
   * query result.
   */
  async test({ credential }, ctx) {
    const { token, projectId } = credential as { token?: string; projectId?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    if (!projectId) return { ok: false, message: "credential missing projectId" };

    const res = await ctx.fetch(
      `${MANAGEMENT_HOST}/${API_VERSION}/projects/${encodeURIComponent(projectId)}`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/json" } },
    );
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return {
        ok: false,
        message: `Sanity rejected the token (${res.status}) — it may be revoked, or issued for ` +
          "another project",
      };
    }
    if (res.status === 404) {
      await res.body?.cancel();
      return { ok: false, message: `no project "${projectId}" reachable with this token` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Sanity returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as { displayName?: string } | null;
    return {
      ok: true,
      message: body?.displayName ? `connected to ${body.displayName}` : undefined,
    };
  },

  /**
   * Records what every action needs to build a URL — and nothing secret. The
   * dataset is checked here rather than at first use, because a typo in it
   * produces a "Dataset not found" from a hostname that looks right.
   */
  async afterConnect({ credential }, ctx) {
    const { token, projectId, dataset, useCdn } = credential as {
      token: string;
      projectId: string;
      dataset?: string;
      useCdn?: boolean;
    };
    const display: Record<string, unknown> = {
      projectId,
      dataset: dataset || "production",
      useCdn: useCdn === true,
    };

    const res = await ctx.fetch(
      `${MANAGEMENT_HOST}/${API_VERSION}/projects/${encodeURIComponent(projectId)}`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/json" } },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return display;
    }
    const body = await res.json().catch(() => null) as { displayName?: string } | null;
    if (body?.displayName) display.projectName = body.displayName;
    return display;
  },
};

export default token;

/** Exported for the health checks, which build their own URLs. */
export function projectDataHost(projectId: string, useCdn = false): string {
  return dataHost(projectId, useCdn);
}
