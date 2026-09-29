import type { HookContext } from "@w6w/types";

/**
 * Sharetribe Asset Delivery API — read-only, and not credential-shaped at all.
 *
 * Verified 2026-09-29 against `sharetribe.com/api-reference/asset-delivery-api.html` plus a
 * live probe against `cdn.st-api.com`.
 *
 * The vendor's own words: "Requests to the Asset Delivery API are authenticated with a client
 * ID of a valid Marketplace API application. The client ID is given as part of the request URL
 * path and **is not sent as a separate header**." A Marketplace API client ID is a public
 * value — it is meant to ship inside a browser bundle, the same as a Stripe *publishable* key —
 * so this is not a secret to route through `sign`; it is a plain path segment. The actions in
 * `actions/asset-*.ts` therefore take it as an ordinary required `param`, `requiresAuth: false`,
 * the same shape CloudConvert's public `operation-list` action uses in this pack.
 *
 * A made-up/unknown client ID does not distinguish itself from a made-up asset path — both come
 * back `404 {"errors":[{"code":"not-found",...}]}`, measured live 2026-09-29 — so there is no
 * "is this client ID even real" probe to build a health check on; see health/service.ts, which
 * covers this surface via the vendor's own status page component instead.
 */
export const ASSET_BASE = "https://cdn.st-api.com/v1/assets/pub";

export interface AssetImageVariant {
  width: number;
  height: number;
  url: string;
}

export interface AssetIncludedImage {
  id: string;
  type: "imageAsset";
  attributes: { assetPath: string; variants: Record<string, AssetImageVariant> };
}

export interface SingleAssetResponse {
  data: Record<string, unknown>;
  included?: AssetIncludedImage[];
  meta: { version: string };
}

export interface MultiAssetResponse {
  data: Array<{ id: string; type: string; attributes: { assetPath: string; data: unknown } }>;
  included?: AssetIncludedImage[];
  meta: { version: string };
}

/** Path-escape one user-supplied path segment, without eating the `/` that separates them. */
function encodeSegments(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export class AssetDeliveryClient {
  constructor(private ctx: HookContext) {}

  private async get<T>(path: string): Promise<T> {
    const res = await this.ctx.fetch(path, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) {
      let message = `Sharetribe Asset Delivery API returned ${res.status} for ${path}`;
      try {
        const body = JSON.parse(text) as { errors?: Array<{ code?: string; title?: string }> };
        const first = body.errors?.[0];
        if (first) message += `: ${first.code ?? "error"} — ${first.title ?? ""}`.trim();
      } catch { /* not JSON */ }
      throw new Error(message);
    }
    return JSON.parse(text) as T;
  }

  /** `GET /v1/assets/pub/{clientId}/a/latest/{assetPath}` — one asset by its latest alias. */
  assetByLatest(clientId: string, assetPath: string): Promise<SingleAssetResponse> {
    const path = `${ASSET_BASE}/${encodeURIComponent(clientId)}/a/latest/${
      encodeSegments(assetPath.replace(/^\/+/, ""))
    }`;
    return this.get<SingleAssetResponse>(path);
  }

  /**
   * `GET /v1/assets/pub/{clientId}/a/latest/[prefix/]?assets=a,b,c` — several assets by their
   * latest alias. The vendor requires the path component to end with `/`.
   */
  assetsByLatest(
    clientId: string,
    assetPaths: string[],
    pathPrefix?: string,
  ): Promise<MultiAssetResponse> {
    const prefix = pathPrefix ? `${encodeSegments(pathPrefix.replace(/^\/+|\/+$/g, ""))}/` : "";
    const url = new URL(`${ASSET_BASE}/${encodeURIComponent(clientId)}/a/latest/${prefix}`);
    url.searchParams.set("assets", assetPaths.join(","));
    return this.get<MultiAssetResponse>(url.toString());
  }
}
