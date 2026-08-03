import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Conversions API access token — the path Meta documents and recommends.
 *
 * In Events Manager, open the dataset → Settings → Conversions API →
 * "Generate access token". Meta is explicit that this needs nothing else:
 *
 *   "Your app does not need to go through App Review. You do not need to
 *    request any permissions."
 *   — developers.facebook.com/docs/marketing-api/conversions-api/get-started
 *     (checked 2026-08-03)
 *
 * The token is a system-user token scoped to that one dataset, so the dataset
 * id belongs to the Connection rather than to every action call — it is
 * collected here and echoed into `display.dataset` by `afterConnect`, where
 * `lib/client.ts#datasetFromConnection` picks it up. Actions may still override
 * it per call.
 *
 * `type: "bearer"` rather than `apiKey`: Graph accepts the token either as an
 * `access_token` query parameter or as a bearer credential in the request
 * header, and the header keeps it out of URLs (and therefore out of proxy and
 * request logs). Same choice as the sibling `facebook` / `facebook-lead-ads`
 * apps' `page-token` methods.
 */
const conversionsToken: AuthDefinition = {
  key: "conversions-token",
  type: "bearer",
  displayName: "Conversions API Token",
  description:
    "Paste the access token generated for this dataset in Events Manager, plus the dataset (pixel) ID it belongs to.",
  connectionLabel: "Dataset {{dataset.id}}",
  fields: [
    {
      key: "accessToken",
      label: "Conversions API Access Token",
      type: "secret",
      required: true,
      hint:
        "Events Manager → your dataset → Settings → Conversions API → Generate access token. A System User token from Business Manager also works.",
    },
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      required: true,
      hint:
        "The numeric dataset ID shown at the top of Events Manager. Server events and browser Pixel events must share it for deduplication to work.",
      validation: { pattern: "^[0-9]+$" },
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /me` is the cheapest call any Meta token can make, and — crucially —
   * the only one a dataset-scoped Conversions API token is guaranteed to be
   * allowed. Probing the dataset node instead would report a perfectly working
   * credential as broken whenever the token lacks `ads_read`, which is the
   * normal case for an Events Manager token.
   */
  async test({ credential }, ctx) {
    const { accessToken, datasetId } = credential as {
      accessToken?: string;
      datasetId?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!datasetId) return { ok: false, message: "credential missing datasetId" };
    const res = await ctx.fetch(`${API_URL}/me?fields=id`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Meta returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Stamp the dataset onto the Connection so actions can read it without ever
   * seeing the credential. The dataset's *name* is a nicety — reading it needs
   * `ads_read`, which an Events Manager token usually lacks — so a failed
   * lookup still records the id. Losing the id here would break every action.
   */
  async afterConnect({ credential }, ctx) {
    const { datasetId } = (credential ?? {}) as { datasetId?: string };
    if (!datasetId) return {};
    const res = await ctx.fetch(`${API_URL}/${datasetId}?fields=id,name`);
    if (!res.ok) return { dataset: { id: datasetId } };
    const dataset = await res.json() as { id?: string; name?: string };
    return { dataset: { id: dataset.id ?? datasetId, name: dataset.name } };
  },
};

export default conversionsToken;
