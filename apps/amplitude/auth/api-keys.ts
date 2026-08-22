import type { AuthDefinition } from "@w6w/types";
import { describeDashboard, HOSTS, regionOf } from "../lib/client.ts";

/**
 * Amplitude's two keys, which do two different jobs.
 *
 * ## The API key writes; the secret key reads
 *
 * The **API key** identifies a project and is deliberately semi-public — it is
 * compiled into mobile apps and served in browser bundles, where anyone can
 * read it. It can therefore only *send* events.
 *
 * The **secret key** is what queries. It never leaves a server, and the query
 * side takes both as HTTP Basic (`apiKey:secretKey`).
 *
 * Using the API key alone against the query side returns `Invalid API Key`,
 * which is true and misleading: the key is fine, the *pair* is not. Verified
 * live on 2026-08-18, and the error handler says so wherever it appears.
 *
 * ## One hook, three injection sites
 *
 * The sign hook is the only place a credential is read, and Amplitude needs it
 * in three different forms:
 *
 * 1. **Query hosts** (`amplitude.com`, `analytics.eu.amplitude.com`) — an
 *    `Authorization: Basic` header of `apiKey:secretKey`.
 * 2. **JSON ingest** (`/2/httpapi`, `/batch`) — `api_key` as a field *inside
 *    the JSON body*.
 * 3. **Form ingest** (`/identify`, `/groupidentify`) — `api_key` as a
 *    form-encoded parameter.
 *
 * `SignableRequest` exposes the body, so all three happen here and no action
 * ever touches a credential.
 *
 * ## The region decides all four hosts
 *
 * A project lives in the US or the EU, and both sides have their own host in
 * each. An EU project's key against a US host is rejected with the same message
 * a wrong key gets.
 */
const apiKeys: AuthDefinition = {
  key: "api-keys",
  type: "custom",
  displayName: "API Key & Secret Key",
  description:
    "Amplitude's two keys. The API key WRITES and is semi-public — it ships inside apps. The " +
    "secret key READS. Using the API key alone to query returns `Invalid API Key`, which is " +
    "true and misleading.",
  connectionLabel: "Amplitude ({{region}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → Projects → your project → General. This is the one that ships inside " +
        "mobile and browser clients, so it can only send events.",
    },
    {
      key: "secretKey",
      label: "Secret Key",
      type: "secret",
      required: true,
      hint: "The same screen, below the API key. This is what reads — without it every query " +
        "endpoint returns `Invalid API Key` however good the API key is.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "US",
      options: [
        { value: "US", label: "US — api2.amplitude.com / amplitude.com" },
        { value: "EU", label: "EU — api.eu.amplitude.com / analytics.eu.amplitude.com" },
      ],
      hint: "Both sides have their own host per region. An EU project's key against a US host " +
        "fails exactly as a wrong key does.",
    },
  ],

  /**
   * Three injection sites, chosen by host and content type. This is the only
   * hook that sees either key.
   */
  sign({ request, credential }) {
    const { apiKey, secretKey } = credential as { apiKey: string; secretKey?: string };
    const host = new URL(request.url).hostname;
    const isIngest = host === "api2.amplitude.com" || host === "api.eu.amplitude.com";

    if (!isIngest) {
      // Query side: both keys, as HTTP Basic.
      request.headers["authorization"] = `Basic ${btoa(`${apiKey}:${secretKey ?? ""}`)}`;
      return request;
    }

    const contentType = request.headers["content-type"] ?? request.headers["Content-Type"] ?? "";
    if (contentType.includes("x-www-form-urlencoded")) {
      // `/identify` and `/groupidentify`.
      const form = new URLSearchParams(request.body ?? "");
      form.set("api_key", apiKey);
      request.body = form.toString();
      return request;
    }

    // JSON ingest: the key is a field in the body, not a header.
    try {
      const body = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
      body.api_key = apiKey;
      request.body = JSON.stringify(body);
    } catch {
      // A body that is not JSON is not something this hook can sign; leaving it
      // alone produces Amplitude's own error rather than a corrupted request.
    }
    return request;
  },

  /**
   * `GET /api/2/events/list` on the query side — the cheapest call that proves
   * **both** keys, which is the pair worth proving.
   */
  async test({ credential }, ctx) {
    const { apiKey, secretKey, region } = credential as {
      apiKey?: string;
      secretKey?: string;
      region?: string;
    };
    if (!apiKey) return { ok: false, message: "credential missing the API key" };
    if (!secretKey) {
      return {
        ok: false,
        message: "credential missing the secret key — the API key alone can send events but " +
          "cannot query anything",
      };
    }

    const host = HOSTS[regionOf(region)].query;
    let res: Response;
    try {
      res = await ctx.fetch(`${host}/api/2/events/list`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      const other = regionOf(region) === "EU" ? "US" : "EU";
      return {
        ok: false,
        message: `${describeDashboard(res.status, text)}. If both keys are definitely right, try ` +
          `the ${other} region — a project in the other data centre fails with this same message`,
      };
    }

    let events: unknown[] = [];
    try {
      const body = JSON.parse(text) as { data?: unknown[] } | unknown[];
      events = Array.isArray(body) ? body : (body?.data ?? []);
    } catch {
      return { ok: false, message: "Amplitude did not return JSON" };
    }

    return {
      ok: true,
      message: `connected to the ${regionOf(region)} region — ${events.length} event types ` +
        "defined in this project",
    };
  },

  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: regionOf(region) };
  },
};

export default apiKeys;
