import type { AuthDefinition } from "@w6w/types";
import { assertLinkname, baseUrl, type Envelope, errorMessage, hostFor } from "../lib/client.ts";

/**
 * Access token + link name (`custom`).
 *
 * Salesmate's v4 reference ("For our v4 API's we need to pass the following
 * Headers") names exactly two credentials-bearing headers: `accessToken` — the
 * user's token from Profile > My Account > Access Keys — and `x-linkname`, the
 * account's own host (`demo.salesmate.io`). Neither is a Bearer/Basic scheme,
 * hence `custom`.
 *
 * `sign` also refuses to attach the token to a request for any host other than
 * the one this credential's link name names, so a mis-built URL cannot deliver
 * the token to a different `*.salesmate.io` account.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "custom",
  displayName: "Access Token",
  description: "Find your access token under Profile > My Account > Access Keys in Salesmate.",
  connectionLabel: "{{linkname}}.salesmate.io",
  fields: [
    {
      key: "linkname",
      label: "Link name",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.salesmate.io` — not the full URL.",
      validation: { pattern: "^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$" },
    },
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Profile > My Account > Access Keys.",
    },
  ],

  sign({ request, credential }) {
    const { linkname, accessToken } = credential as { linkname?: string; accessToken?: string };
    const host = hostFor(assertLinkname(linkname));
    if (new URL(request.url).hostname.toLowerCase() !== host.toLowerCase()) {
      throw new Error("Refusing to sign a request for a host other than this connection's.");
    }
    request.headers["accesstoken"] = String(accessToken ?? "");
    request.headers["x-linkname"] = host;
    return request;
  },

  /**
   * Salesmate has no whoami endpoint. `GET /core/v4/users?status=active` (the
   * documented "Get Active Users" call) is the cheapest read a token can make
   * without module-specific access, and its body is a list of the account's
   * users — it never echoes the caller's token. Classified by body, not status:
   * a live token answers `{"Status":"success","Data":[...]}`; a dead one
   * answers `{"Status":"failure","Error":{"name":"AuthorizationFailed"}}` (HTTP
   * 403, measured against a real account host), and an unknown link name
   * `NoSuchLinkExist`.
   */
  async test({ credential }, ctx) {
    const { linkname, accessToken } = credential as { linkname?: string; accessToken?: string };
    if (!linkname || !accessToken) {
      return { ok: false, message: "credential missing linkname or accessToken" };
    }
    let url: string;
    try {
      url = `${baseUrl(linkname)}/core/v4/users?status=active`;
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
    const res = await ctx.fetch(url, {
      headers: { accesstoken: accessToken, "x-linkname": hostFor(linkname) },
    });
    const body = await res.json().catch(() => undefined) as Envelope | undefined;
    if (body?.Status === "success" && Array.isArray(body.Data)) return { ok: true };
    const name = body?.Error?.Name ?? body?.Error?.name;
    if (name === "AuthorizationFailed") {
      return { ok: false, message: "Salesmate rejected the access token." };
    }
    if (name === "NoSuchLinkExist") {
      return { ok: false, message: "No Salesmate account exists for this link name." };
    }
    return { ok: false, message: errorMessage(body, `Salesmate returned ${res.status}`) };
  },

  /** Records the link name on the connection so the client can build URLs without the credential. */
  afterConnect({ credential }) {
    const { linkname } = credential as { linkname?: string };
    return linkname ? { linkname } : {};
  },
};

export default accessToken;
