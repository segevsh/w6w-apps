import type { AuthDefinition } from "@w6w/types";
import { DELIVERY_HOSTS, describeError } from "../lib/client.ts";

/**
 * A space access token for the Content Delivery API, sent as a **query
 * parameter**.
 *
 * ## Public and preview are different tokens with different reach
 *
 * - **Public** sees `published` content. This is the production token; a
 *   request for `version=draft` with it returns published content or nothing.
 * - **Preview** sees `draft` *and* `published`. It is for the Visual Editor
 *   and staging, and it can read work nobody has approved.
 *
 * The API does not say which one it was given. So the test asks for a draft
 * and compares, which is the only way to know before somebody's unpublished
 * draft either fails to appear or appears where it should not.
 *
 * ## The token goes in the URL, which is not a mistake
 *
 * Storyblok's delivery tokens are designed to be public — they end up in
 * browser bundles by design. That is also why they are read-only and
 * per-space, and why one leaking is a smaller problem than a management token
 * leaking. It still means the token appears in logs and referrers, so a
 * *preview* token, which can read unpublished content, should be treated as a
 * secret even though a public one need not be.
 *
 * ## A space lives in one region
 *
 * Pointing a US space's token at the EU host is a 401 that reads exactly like
 * a wrong token. The region is chosen here, once.
 */
const auth: AuthDefinition = {
  key: "delivery-token",
  type: "apiKey",
  displayName: "Space access token",
  apiKey: { in: "query", name: "token" },
  connectionLabel: "{{spaceName}} ({{tokenKind}})",
  description:
    "A space access token for the read-only Content Delivery API, sent as a QUERY PARAMETER. " +
    "The test reports whether it is a PUBLIC token (published content only) or a PREVIEW one, " +
    "which can read unpublished drafts — the API itself never says which it was given.",
  fields: [
    {
      key: "token",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Space → Settings → Access Tokens. A public token is safe in a browser; a preview " +
        "token can read unpublished drafts and should not be.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "eu",
      required: true,
      options: [
        { value: "eu", label: "European Union — api.storyblok.com" },
        { value: "us", label: "United States — api-us.storyblok.com" },
        { value: "ca", label: "Canada — api-ca.storyblok.com" },
        { value: "ap", label: "Australia — api-ap.storyblok.com" },
        { value: "cn", label: "China — app.storyblokchina.cn" },
      ],
      hint: "A space lives in exactly one region. The wrong one is a 401 that looks identical to " +
        "a wrong token.",
    },
  ],

  sign({ request, credential }) {
    const token = String((credential as Record<string, unknown>)?.token ?? "");
    const url = new URL(request.url);
    // The delivery API takes its credential in the query string, by design.
    url.searchParams.set("token", token);
    return { ...request, url: url.toString() };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const region = String(fields?.region ?? "eu");
    const host = DELIVERY_HOSTS[region] ?? DELIVERY_HOSTS.eu;

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/v2/cdn/spaces/me`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text, "delivery") };

    interface SpaceResponse {
      space?: { id?: number; name?: string; version?: number };
    }
    let space: SpaceResponse["space"];
    try {
      space = (JSON.parse(text) as SpaceResponse)?.space;
    } catch { /* an unexpected shape is still an authenticated call */ }

    // The API never says which kind of token this is, so ask for a draft.
    let tokenKind = "public";
    try {
      const draft = await ctx.fetch(
        `${host}/v2/cdn/stories?version=draft&per_page=1`,
        { headers: { accept: "application/json" } },
      );
      if (draft.ok) tokenKind = "preview";
    } catch { /* the distinction is a courtesy, not a gate */ }

    return {
      ok: true,
      message: `reached ${space?.name ?? "the space"} (id ${space?.id ?? "?"}) in the ${region} ` +
        `region with a ${tokenKind.toUpperCase()} token` +
        (tokenKind === "preview"
          ? " — it can read UNPUBLISHED drafts, so treat it as a secret"
          : " — it sees published content only, so a draft will read as missing"),
    };
  },

  async afterConnect({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const region = String(fields?.region ?? "eu");
    const host = DELIVERY_HOSTS[region] ?? DELIVERY_HOSTS.eu;

    let spaceName = "";
    let spaceId: number | undefined;
    let cacheVersion: number | undefined;
    try {
      const res = await ctx.fetch(`${host}/v2/cdn/spaces/me`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json() as {
          space?: { id?: number; name?: string; version?: number };
        };
        spaceName = String(body?.space?.name ?? "");
        spaceId = body?.space?.id;
        cacheVersion = body?.space?.version;
      }
    } catch { /* the label is a convenience, not a gate */ }

    let tokenKind = "public";
    try {
      const draft = await ctx.fetch(`${host}/v2/cdn/stories?version=draft&per_page=1`, {
        headers: { accept: "application/json" },
      });
      if (draft.ok) tokenKind = "preview";
    } catch { /* leave it as the safer assumption */ }

    return {
      credentialKind: "delivery",
      region,
      spaceId,
      spaceName,
      tokenKind,
      cacheVersion,
    };
  },
};

export default auth;
