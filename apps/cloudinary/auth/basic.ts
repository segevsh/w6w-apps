import type { AuthDefinition } from "@w6w/types";
import { hostForRegion, REGION_HOSTS } from "../lib/client.ts";

/**
 * Cloudinary API key and secret, sent as HTTP **Basic** auth.
 *
 * Three fields rather than two, because a Cloudinary credential is not just a
 * key: the **cloud name** is part of every URL path, and the **region** decides
 * which of three API hosts to call. All three come from the same place in the
 * console (Settings → API Keys, and the environment's URL).
 *
 * ## The Upload API takes this credential too — measured, not documented
 *
 * Cloudinary's Upload API documents a per-request SHA-1 `signature` computed
 * over the sorted parameters plus the API secret. An App cannot do that: the
 * sandbox lets only this `sign` hook near a credential, and a signature depends
 * on the request body.
 *
 * Verified against the live host 2026-08-18:
 *
 *   - `POST /v1_1/demo/image/upload` with **no** credential →
 *     `{"error":{"message":"Upload preset must be whitelisted for unsigned uploads"}}`
 *   - the same call with a **bogus Basic** credential →
 *     `{"error":{"message":"unknown api_key"}}`
 *
 * The second answer means Cloudinary evaluated the Basic credential rather than
 * looking for a signature. So `asset-upload` and the other Upload API actions
 * work with this connection, and the secret never leaves this file.
 *
 * ## Getting the region wrong is an auth failure, not a redirect
 *
 * A cloud in the EU datacenter answered from `api.cloudinary.com` fails
 * authentication. That is worth knowing because the symptom ("invalid
 * credentials") points at the key rather than at the host, and the fix is a
 * dropdown.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Key & Secret",
  description:
    "A Cloudinary API key and secret, plus the cloud name and the datacenter it lives in. Used " +
    "for both the Admin API and — verified against the live host — the Upload API.",
  connectionLabel: "{{cloudName}} ({{region}})",
  fields: [
    {
      key: "cloudName",
      label: "Cloud Name",
      type: "string",
      required: true,
      placeholder: "my-company",
      hint: "The product environment name — it is in every Cloudinary URL and in Settings → " +
        "API Keys.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Console → Settings → API Keys. Numeric.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
    },
    {
      key: "region",
      label: "Datacenter",
      type: "select",
      default: "us",
      options: [
        { value: "us", label: "US — api.cloudinary.com (the default)" },
        { value: "eu", label: "EU — api-eu.cloudinary.com" },
        { value: "ap", label: "Asia-Pacific — api-ap.cloudinary.com" },
      ],
      hint: "Where your product environment lives. The wrong one fails authentication rather " +
        "than redirecting, so a credentials error can really be a region error.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, apiSecret } = credential as { apiKey: string; apiSecret: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
    return request;
  },

  /**
   * `GET /ping` is Cloudinary's own liveness route and the cheapest call that
   * proves all four fields line up — key, secret, cloud name and region — since
   * the cloud name is in the path and the region is in the host.
   */
  async test({ credential }, ctx) {
    const { apiKey, apiSecret, cloudName, region } = credential as {
      apiKey?: string;
      apiSecret?: string;
      cloudName?: string;
      region?: string;
    };
    if (!apiKey || !apiSecret) return { ok: false, message: "credential missing apiKey/apiSecret" };
    if (!cloudName) return { ok: false, message: "credential missing cloudName" };

    const host = hostForRegion(region);
    const res = await ctx.fetch(`${host}/v1_1/${encodeURIComponent(cloudName)}/ping`, {
      headers: {
        authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        accept: "application/json",
      },
    });
    if (res.status === 401) {
      // Cloudinary distinguishes these two in the body, and they have very
      // different fixes.
      const detail = res.headers.get("x-cld-error") ?? (await res.text().catch(() => ""));
      if (/unknown api_key/i.test(detail)) {
        return {
          ok: false,
          message: `Cloudinary does not recognise this API key in the ${
            String(region ?? "us")
              .toUpperCase()
          } datacenter — check the key, and check the region`,
        };
      }
      return { ok: false, message: `Cloudinary rejected the credentials: ${detail || "401"}` };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no cloud named "${cloudName}" in the ${String(region ?? "us").toUpperCase()} ` +
          "datacenter",
      };
    }
    if (!res.ok) return { ok: false, message: `Cloudinary returned ${res.status}` };
    return { ok: true, message: `connected to ${cloudName}` };
  },

  /**
   * Records the cloud name and region on the Connection — both are needed to
   * build a URL, and neither is a secret. The key and secret never appear.
   */
  afterConnect({ credential }) {
    const { cloudName, region } = credential as { cloudName?: string; region?: string };
    const key = String(region ?? "us").toLowerCase();
    return {
      cloudName,
      region: key in REGION_HOSTS ? key : "us",
    };
  },
};

export default basic;
